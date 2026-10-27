import forge from 'node-forge'
import { PDFDocument } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { readCertificate, signPdf, SignError } from './sign'
import { readSignatures, signatureReportText, verifySignatures, VerifyError } from './verifySign'

/** A throwaway self-signed certificate, the way a test user would make one. */
function makeP12(password: string, name = 'Asha Verma') {
  const keys = forge.pki.rsa.generateKeyPair(1024)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date(Date.now() - 86_400_000)
  cert.validity.notAfter = new Date(Date.now() + 86_400_000 * 365)
  const attrs = [
    { name: 'commonName', value: name },
    { name: 'organizationName', value: 'Klyro test' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    generateLocalKeyId: true,
    friendlyName: name,
  })
  const der = forge.asn1.toDer(asn1).getBytes()
  const bytes = new Uint8Array(der.length)
  for (let i = 0; i < der.length; i++) bytes[i] = der.charCodeAt(i)
  return new File([bytes as BlobPart], 'asha.p12')
}

async function makePdf(pages = 2): Promise<File> {
  const doc = await PDFDocument.create()
  doc.setTitle('agreement')
  for (let i = 0; i < pages; i++) doc.addPage([400, 500])
  return new File([(await doc.save()) as BlobPart], 'agreement.pdf', { type: 'application/pdf' })
}

let certificate: File

beforeAll(() => {
  certificate = makeP12('hunter2')
}, 30_000)

const params = () => ({
  certificate,
  password: 'hunter2',
  name: 'Asha Verma',
  reason: 'I agree to the terms',
  location: 'Pune',
  contactInfo: 'asha@example.com',
})

describe('readCertificate', () => {
  it('opens a PKCS#12 file with the right password', async () => {
    const signer = await readCertificate(certificate, 'hunter2')
    expect(signer.certificate.subject.getField('CN')?.value).toBe('Asha Verma')
    expect(signer.key).toBeTruthy()
  })

  it('refuses the wrong password', async () => {
    await expect(readCertificate(certificate, 'nope')).rejects.toBeInstanceOf(SignError)
  })

  it('refuses a file that is not a certificate', async () => {
    const junk = new File([new TextEncoder().encode('hello') as BlobPart], 'note.p12')
    await expect(readCertificate(junk, 'hunter2')).rejects.toBeInstanceOf(SignError)
  })
})

describe('signPdf', () => {
  it('produces a readable PDF that still has its pages', async () => {
    const out = await signPdf(await makePdf(3), params())
    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(3)
    expect(doc.getTitle()).toBe('agreement')
    expect(out.file.name).toBe('agreement-signed.pdf')
    expect(out.note).toBe('Asha Verma')
  }, 30_000)

  it('writes one signature whose byte range covers the whole file', async () => {
    const out = await signPdf(await makePdf(), params())
    const bytes = new Uint8Array(await out.file.arrayBuffer())
    const found = readSignatures(bytes)
    expect(found).toHaveLength(1)
    const [start, length, resume, tail] = found[0].byteRange
    expect(start).toBe(0)
    expect(resume + tail).toBe(bytes.length)
    // the gap is exactly the hex blob, delimiters included
    expect(resume - length).toBeGreaterThan(16_000)
  }, 30_000)
})

describe('verifySignatures', () => {
  it('confirms a signature it just made', async () => {
    const out = await signPdf(await makePdf(), params())
    const [report] = await verifySignatures(out.file)

    expect(report.signer).toBe('Asha Verma')
    expect(report.selfSigned).toBe(true)
    expect(report.contentMatches).toBe(true)
    expect(report.signatureValid).toBe(true)
    expect(report.coversWholeFile).toBe(true)
    expect(report.certificateCurrent).toBe(true)
    expect(report.algorithm).toBe('SHA256')
    expect(report.reason).toBe('I agree to the terms')
    expect(report.location).toBe('Pune')
    expect(report.signedAt?.getFullYear()).toBe(new Date().getFullYear())
  }, 30_000)

  it('notices a page edited after signing', async () => {
    const out = await signPdf(await makePdf(), params())
    const bytes = new Uint8Array(await out.file.arrayBuffer())

    // flip a byte well inside the signed region, past the header
    const tampered = bytes.slice()
    tampered[900] = tampered[900] === 65 ? 66 : 65
    const [report] = await verifySignatures(new File([tampered as BlobPart], 'edited.pdf'))

    expect(report.contentMatches).toBe(false)
    expect(report.signatureValid).toBe(true) // the blob itself is untouched
  }, 30_000)

  it('rejects a signature whose value was altered, even when the content still matches', async () => {
    // The other tamper tests change the document and are caught by the digest.
    // This one leaves every signed byte alone and corrupts only the RSA
    // signature, so the only thing that can catch it is the public-key check
    // itself — the code node-forge's PKCS#1 v1.5 fix lives in.
    const out = await signPdf(await makePdf(), params())
    const bytes = new Uint8Array(await out.file.arrayBuffer())
    const text = new TextDecoder('latin1').decode(bytes)

    const open = text.indexOf('<', text.indexOf('/Contents')) + 1
    const hex = text.slice(open, text.indexOf('>', open))
    const der = Uint8Array.from(hex.match(/../g)!, (pair) => Number.parseInt(pair, 16))

    // the blob is zero-padded to its reserved size; find where the DER really ends
    const lengthBytes = der[1] & 0x80 ? der[1] & 0x7f : 0
    let length = lengthBytes ? 0 : der[1]
    for (let i = 0; i < lengthBytes; i++) length = (length << 8) | der[2 + i]
    const end = 2 + lengthBytes + length

    // the RSA signature value is the last field of the SignerInfo
    const at = end - 8
    const flipped = (der[at] ^ 0xff).toString(16).padStart(2, '0')
    const position = open + at * 2
    const tampered = bytes.slice()
    tampered[position] = flipped.charCodeAt(0)
    tampered[position + 1] = flipped.charCodeAt(1)

    const [report] = await verifySignatures(new File([tampered as BlobPart], 'forged.pdf'))
    // still parsed: the rejection came from the RSA check, not from a broken blob
    expect(report.signer).toBe('Asha Verma')
    expect(report.contentMatches).toBe(true)
    expect(report.signatureValid).toBe(false)
  }, 30_000)

  it('notices bytes appended after the signed range', async () => {
    const out = await signPdf(await makePdf(), params())
    const bytes = new Uint8Array(await out.file.arrayBuffer())
    const extended = new Uint8Array(bytes.length + 64)
    extended.set(bytes, 0)
    extended.fill(37, bytes.length)

    const [report] = await verifySignatures(new File([extended as BlobPart], 'appended.pdf'))
    expect(report.coversWholeFile).toBe(false)
    expect(report.unsignedBytes).toBe(64)
  }, 30_000)

  it('says so when there is no signature at all', async () => {
    await expect(verifySignatures(await makePdf())).rejects.toBeInstanceOf(VerifyError)
  })
})

describe('signatureReportText', () => {
  it('writes the findings out in plain words', async () => {
    const out = await signPdf(await makePdf(), params())
    const text = signatureReportText('agreement-signed.pdf', await verifySignatures(out.file))
    expect(text).toContain('Asha Verma')
    expect(text).toContain('Content unchanged yes')
    expect(text).toContain('self-signed')
  }, 30_000)
})
