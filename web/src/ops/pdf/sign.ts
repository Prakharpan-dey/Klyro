import type { PDFDocument, PDFPage } from 'pdf-lib'
import type forgeNs from 'node-forge'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib } from './load'

/**
 * A cryptographic signature, as opposed to a drawn one. The document gets a
 * signature field whose /Contents holds a detached PKCS#7 blob covering every
 * byte of the file except the blob itself, so any later edit breaks it.
 *
 * The certificate and its password never leave the tab: the PKCS#12 file is
 * read with FileReader and the signing happens here in JavaScript.
 */

export class SignError extends Error {}

type Forge = typeof forgeNs

let forgeLib: Promise<Forge> | null = null

function forge(): Promise<Forge> {
  forgeLib ??= import('node-forge').then((mod) => (mod.default ?? mod) as Forge)
  return forgeLib
}

/** Reserved room for the signature, in bytes. 8 KB fits a certificate chain. */
const SIGNATURE_BYTES = 8192
const RANGE_PLACEHOLDER = '**********'

export interface Signer {
  key: forgeNs.pki.rsa.PrivateKey
  certificate: forgeNs.pki.Certificate
  chain: forgeNs.pki.Certificate[]
}

/** Common name of a certificate subject, falling back to whatever it does carry. */
export function commonName(subject: forgeNs.pki.Certificate['subject']): string {
  const field = subject.getField('CN') ?? subject.getField('O') ?? subject.attributes[0]
  return (field?.value as string) || 'unnamed'
}

export async function readCertificate(file: File, password: string): Promise<Signer> {
  const f = await forge()
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  let store: forgeNs.pkcs12.Pkcs12Pfx
  try {
    store = f.pkcs12.pkcs12FromAsn1(f.asn1.fromDer(f.util.createBuffer(binary)), password)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/mac|password/i.test(message)) throw new SignError('Wrong password for this certificate')
    throw new SignError('This file is not a PKCS#12 certificate (.p12 or .pfx)')
  }

  const keyBags = [
    ...(store.getBags({ bagType: f.pki.oids.pkcs8ShroudedKeyBag })[
      f.pki.oids.pkcs8ShroudedKeyBag
    ] ?? []),
    ...(store.getBags({ bagType: f.pki.oids.keyBag })[f.pki.oids.keyBag] ?? []),
  ]
  const certBags = store.getBags({ bagType: f.pki.oids.certBag })[f.pki.oids.certBag] ?? []

  const key = keyBags.find((bag) => bag.key)?.key as forgeNs.pki.rsa.PrivateKey | undefined
  const certificates = certBags.map((bag) => bag.cert).filter(Boolean) as forgeNs.pki.Certificate[]
  if (!key) throw new SignError('This certificate holds no private key, so it cannot sign')
  if (!certificates.length) throw new SignError('This certificate file holds no certificate')

  // the signing certificate is the one whose public key matches the private key
  const own =
    certificates.find(
      (cert) =>
        (cert.publicKey as forgeNs.pki.rsa.PublicKey).n?.toString(16) === key.n?.toString(16),
    ) ?? certificates[0]

  return { key, certificate: own, chain: certificates.filter((cert) => cert !== own) }
}

export interface SignParams {
  certificate: File
  password: string
  name: string
  reason: string
  location: string
  contactInfo: string
}

/** Signature dictionary, widget and AcroForm entry, with room reserved for the blob. */
async function addPlaceholder(doc: PDFDocument, page: PDFPage, params: SignParams, when: Date) {
  const { PDFArray, PDFHexString, PDFInvalidObject, PDFName, PDFNumber, PDFString, PDFDict } =
    await pdfLib()

  const byteRange = PDFArray.withContext(doc.context)
  byteRange.push(PDFNumber.of(0))
  // three fixed-width names, replaced by the real offsets once the file is laid out
  for (let i = 0; i < 3; i++) byteRange.push(PDFName.of(RANGE_PLACEHOLDER))

  const signature = doc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: byteRange,
    // pdf-lib writes a hex string verbatim, so the zeros here are the hex digits
    Contents: PDFHexString.of('0'.repeat(SIGNATURE_BYTES * 2)),
    M: PDFString.fromDate(when),
    Name: PDFString.of(params.name),
    Reason: PDFString.of(params.reason),
    Location: PDFString.of(params.location),
    ContactInfo: PDFString.of(params.contactInfo),
  })

  // kept as raw bytes so pdf-lib cannot tuck it inside an object stream, where
  // the /Contents placeholder would be compressed and impossible to patch
  const raw = new Uint8Array(signature.sizeInBytes())
  signature.copyBytesInto(raw, 0)
  const signatureRef = doc.context.register(PDFInvalidObject.of(raw))

  const widget = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: doc.context.obj([0, 0, 0, 0]),
    V: signatureRef,
    T: PDFString.of('Signature1'),
    F: 4, // print, but nothing to show on screen
    P: page.ref,
  })
  const widgetRef = doc.context.register(widget)

  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray) ?? doc.context.obj([])
  annots.push(widgetRef)
  page.node.set(PDFName.of('Annots'), annots)

  let form = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)
  if (!form) {
    form = doc.context.obj({ Fields: [] })
    doc.catalog.set(PDFName.of('AcroForm'), doc.context.register(form))
  }
  const flags = form.lookupMaybe(PDFName.of('SigFlags'), PDFNumber)?.asNumber() ?? 0
  form.set(PDFName.of('SigFlags'), PDFNumber.of(flags | 3))
  const fields = form.lookupMaybe(PDFName.of('Fields'), PDFArray) ?? doc.context.obj([])
  fields.push(widgetRef)
  form.set(PDFName.of('Fields'), fields)
}

export function findBytes(haystack: Uint8Array, needle: string, from = 0): number {
  const target = [...needle].map((char) => char.charCodeAt(0))
  outer: for (let i = from; i <= haystack.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) if (haystack[i + j] !== target[j]) continue outer
    return i
  }
  return -1
}

function writeAscii(target: Uint8Array, text: string, at: number) {
  for (let i = 0; i < text.length; i++) target[at + i] = text.charCodeAt(i)
}

/**
 * Replaces the placeholders in a laid-out file: the byte range gets the real
 * offsets, and the reserved hex gets the signature of everything around it.
 */
export function insertSignature(pdf: Uint8Array, sign: (data: Uint8Array) => string): Uint8Array {
  let rangeAt = -1
  let rangeEnd = -1
  for (let at = 0; ;) {
    const found = findBytes(pdf, '/ByteRange', at)
    if (found === -1) break
    const close = findBytes(pdf, ']', found)
    at = close === -1 ? found + 10 : close
    if (close !== -1 && findBytes(pdf.subarray(found, close), RANGE_PLACEHOLDER) !== -1) {
      rangeAt = found
      rangeEnd = close
      break
    }
  }
  if (rangeAt === -1) throw new SignError('The signature placeholder went missing')

  const contentsAt = findBytes(pdf, '/Contents <', rangeEnd)
  const hexFrom = contentsAt + '/Contents '.length
  const hexTo = findBytes(pdf, '>', hexFrom)
  if (contentsAt === -1 || hexTo === -1) throw new SignError('The signature placeholder is broken')

  const before = hexFrom
  const after = hexTo + 1
  const range = [0, before, after, pdf.length - after]

  const out = pdf.slice()
  const width = rangeEnd + 1 - rangeAt
  const written = `/ByteRange [${range.join(' ')}]`.padEnd(width, ' ')
  if (written.length !== width) throw new SignError('The byte range no longer fits')
  writeAscii(out, written, rangeAt)

  const signed = new Uint8Array(range[1] + range[3])
  signed.set(out.subarray(0, range[1]), 0)
  signed.set(out.subarray(range[2], range[2] + range[3]), range[1])

  const hex = sign(signed).toUpperCase()
  const room = hexTo - hexFrom - 1
  if (hex.length > room) throw new SignError('The signature is larger than the space reserved')
  writeAscii(out, hex.padEnd(room, '0'), hexFrom + 1)
  return out
}

export async function signPdf(file: File, params: SignParams): Promise<OutputFile> {
  const f = await forge()
  const signer = await readCertificate(params.certificate, params.password)
  const when = new Date()

  const doc = await loadPdf(file)
  await addPlaceholder(doc, doc.getPage(0), params, when)
  const laid = await doc.save({ useObjectStreams: false })

  const signed = insertSignature(laid, (data) => {
    let binary = ''
    for (const byte of data) binary += String.fromCharCode(byte)

    const p7 = f.pkcs7.createSignedData()
    p7.content = f.util.createBuffer(binary)
    p7.addCertificate(signer.certificate)
    for (const extra of signer.chain) p7.addCertificate(extra)
    p7.addSigner({
      key: signer.key,
      certificate: signer.certificate,
      digestAlgorithm: f.pki.oids.sha256,
      authenticatedAttributes: [
        { type: f.pki.oids.contentType, value: f.pki.oids.data },
        { type: f.pki.oids.messageDigest },
        { type: f.pki.oids.signingTime, value: when.toString() },
      ],
    })
    p7.sign({ detached: true })
    return f.util.bytesToHex(f.asn1.toDer(p7.toAsn1()).getBytes())
  })

  return {
    file: new File([signed as BlobPart], `${baseName(file.name)}-signed.pdf`, {
      type: 'application/pdf',
    }),
    sourceName: file.name,
    sourceSize: file.size,
    note: commonName(signer.certificate.subject),
  }
}
