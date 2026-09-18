import type forgeNs from 'node-forge'
import { commonName, findBytes } from './sign'

/**
 * Reads the signatures out of a PDF and checks them, without asking anyone.
 * Two questions matter: does the signature match the bytes it covers, and do
 * those bytes cover the whole file? A signature can be perfectly valid and
 * still leave a page that was added afterwards unsigned.
 */

type Forge = typeof forgeNs

let forgeLib: Promise<Forge> | null = null

function forge(): Promise<Forge> {
  forgeLib ??= import('node-forge').then((mod) => (mod.default ?? mod) as Forge)
  return forgeLib
}

export interface SignatureReport {
  /** 1 for the first signature in the file */
  index: number
  signer: string
  issuer: string
  selfSigned: boolean
  /** claimed in the signature itself, which is only as trustworthy as the signer */
  signedAt: Date | null
  reason: string | null
  location: string | null
  /** the signed bytes still hash to what the signature says */
  contentMatches: boolean
  /** the signature verifies against the certificate's public key */
  signatureValid: boolean
  /** the signature covers every byte of the file */
  coversWholeFile: boolean
  /** bytes outside the signed ranges, if any */
  unsignedBytes: number
  certificateFrom: Date
  certificateTo: Date
  /** the certificate was valid at the moment it claims to have signed */
  certificateCurrent: boolean
  algorithm: string
}

export class VerifyError extends Error {}

function asciiBetween(pdf: Uint8Array, from: number, to: number): string {
  let text = ''
  for (let i = from; i < to; i++) text += String.fromCharCode(pdf[i])
  return text
}

interface RawSignature {
  byteRange: number[]
  der: string
  dictionary: string
}

/** Every /ByteRange plus the hex blob it points around. */
export function readSignatures(pdf: Uint8Array): RawSignature[] {
  const found: RawSignature[] = []
  let at = 0

  for (;;) {
    const rangeAt = findBytes(pdf, '/ByteRange', at)
    if (rangeAt === -1) break
    const open = findBytes(pdf, '[', rangeAt)
    const close = findBytes(pdf, ']', open)
    at = close === -1 ? rangeAt + 10 : close
    if (open === -1 || close === -1) break

    const numbers = asciiBetween(pdf, open + 1, close)
      .trim()
      .split(/\s+/)
      .map(Number)
    if (numbers.length !== 4 || numbers.some((n) => !Number.isFinite(n))) continue

    const hexFrom = numbers[1]
    const hexTo = numbers[2]
    if (hexTo <= hexFrom || hexTo > pdf.length) continue

    const hex = asciiBetween(pdf, hexFrom + 1, hexTo - 1).replace(/[^0-9a-fA-F]/g, '')
    // the claims (reason, signer, date) sit in the dictionary around the blob
    const dictionary =
      asciiBetween(pdf, Math.max(0, rangeAt - 400), hexFrom) +
      asciiBetween(pdf, hexTo, Math.min(pdf.length, hexTo + 800)).split('endobj')[0]
    if (hex.replace(/0/g, '') === '') continue
    found.push({ byteRange: numbers, der: hex, dictionary })
  }

  return found
}

function claim(dictionary: string, key: string): string | null {
  const match = new RegExp(`/${key}\\s*\\(([^)]*)\\)`).exec(dictionary)
  if (!match) return null
  return match[1].replace(/\\([()\\])/g, '$1').trim() || null
}

function pdfDate(value: string | null): Date | null {
  const match = value && /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(value)
  if (!match) return null
  const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss))
}

const DIGESTS: Record<string, 'sha1' | 'sha256' | 'sha384' | 'sha512'> = {
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
}

export async function verifySignatures(file: File): Promise<SignatureReport[]> {
  const f = await forge()
  const pdf = new Uint8Array(await file.arrayBuffer())
  const raw = readSignatures(pdf)
  if (!raw.length) throw new VerifyError('This PDF carries no digital signature')

  return raw.map((entry, index) => {
    const [start, length, resume, tail] = entry.byteRange
    const signed = new Uint8Array(length + tail)
    signed.set(pdf.subarray(start, start + length), 0)
    signed.set(pdf.subarray(resume, resume + tail), length)

    // the blob is padded with zeros to fill the space reserved for it, so the
    // parser has to stop at the end of the structure rather than the buffer
    const der = f.asn1.fromDer(f.util.createBuffer(f.util.hexToBytes(entry.der)), {
      parseAllBytes: false,
    } as unknown as boolean)

    const message = f.pkcs7.messageFromAsn1(der) as forgeNs.pkcs7.PkcsSignedData & {
      rawCapture: Record<string, unknown>
      certificates: forgeNs.pki.Certificate[]
    }

    const capture = message.rawCapture
    const certificate = message.certificates[0]
    if (!certificate) throw new VerifyError('The signature carries no certificate')

    const digestOid = f.asn1.derToOid(capture.digestAlgorithm as string)
    const algorithm = DIGESTS[digestOid] ?? 'sha256'
    const digest = () => f.md[algorithm].create()

    // what the signer said the content hashes to
    const attributes = (capture.authenticatedAttributes ?? []) as forgeNs.asn1.Asn1[]
    let claimed: string | null = null
    for (const attribute of attributes) {
      const values = (attribute as unknown as { value: forgeNs.asn1.Asn1[] }).value
      const oid = f.asn1.derToOid((values[0] as unknown as { value: string }).value)
      if (oid !== f.pki.oids.messageDigest) continue
      const set = (values[1] as unknown as { value: { value: string }[] }).value
      claimed = set[0]?.value ?? null
    }

    const actual = digest()
    let binary = ''
    for (const byte of signed) binary += String.fromCharCode(byte)
    actual.update(binary)
    const contentMatches = claimed !== null && actual.digest().getBytes() === claimed

    // the attributes themselves are what the private key actually signed
    const set = f.asn1.create(f.asn1.Class.UNIVERSAL, f.asn1.Type.SET, true, attributes)
    const attributeDigest = digest()
    attributeDigest.update(f.asn1.toDer(set).getBytes())

    let signatureValid = false
    try {
      signatureValid = (certificate.publicKey as forgeNs.pki.rsa.PublicKey).verify(
        attributeDigest.digest().getBytes(),
        capture.signature as string,
      )
    } catch {
      signatureValid = false
    }

    const signedAt =
      pdfDate(claim(entry.dictionary, 'M')) ?? (certificate.validity.notBefore as Date | null)
    const unsignedBytes = pdf.length - (length + tail) - (resume - (start + length))

    return {
      index: index + 1,
      signer: commonName(certificate.subject),
      issuer: commonName(certificate.issuer),
      selfSigned: commonName(certificate.issuer) === commonName(certificate.subject),
      signedAt,
      reason: claim(entry.dictionary, 'Reason'),
      location: claim(entry.dictionary, 'Location'),
      contentMatches,
      signatureValid,
      coversWholeFile: resume + tail >= pdf.length - 2,
      unsignedBytes: Math.max(0, unsignedBytes),
      certificateFrom: certificate.validity.notBefore,
      certificateTo: certificate.validity.notAfter,
      certificateCurrent:
        !!signedAt &&
        signedAt >= certificate.validity.notBefore &&
        signedAt <= certificate.validity.notAfter,
      algorithm: algorithm.toUpperCase(),
    }
  })
}

/** A plain-text account of what was found, for keeping alongside the file. */
export function signatureReportText(name: string, reports: SignatureReport[]): string {
  const lines = [`Signature check - ${name}`, `Checked ${new Date().toLocaleString()}`, '']

  for (const report of reports) {
    lines.push(
      `Signature ${report.index}`,
      `  Signer            ${report.signer}`,
      `  Issued by         ${report.issuer}${report.selfSigned ? ' (self-signed)' : ''}`,
      `  Signed at         ${report.signedAt ? report.signedAt.toLocaleString() : 'not stated'}`,
      `  Reason            ${report.reason ?? '-'}`,
      `  Location          ${report.location ?? '-'}`,
      `  Digest            ${report.algorithm}`,
      `  Content unchanged ${report.contentMatches ? 'yes' : 'NO'}`,
      `  Signature valid   ${report.signatureValid ? 'yes' : 'NO'}`,
      `  Covers whole file ${report.coversWholeFile ? 'yes' : `no, ${report.unsignedBytes} bytes outside`}`,
      `  Certificate valid ${report.certificateFrom.toLocaleDateString()} to ${report.certificateTo.toLocaleDateString()}`,
      '',
    )
  }

  lines.push(
    'A valid signature proves the file has not changed since it was signed.',
    'It does not prove who the signer is unless you trust the issuer.',
  )
  return lines.join('\n')
}
