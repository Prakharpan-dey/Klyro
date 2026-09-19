import { renameWithExt } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'

/**
 * What a photo says about you, and how to make it stop.
 *
 * A picture off a phone carries the camera, the moment, often the exact spot
 * on earth, and sometimes the owner's name. None of it is visible, all of it
 * travels with the file, and the usual advice — "re-save it" — throws away
 * quality to do it. This reads the metadata and removes it by rewriting the
 * container, so the pixels come out byte for byte identical.
 */

export type Container = 'jpeg' | 'png' | 'webp' | 'other'

export interface ExifFinding {
  id: string
  label: string
  value: string
  /** identifies a person, a place or a device, rather than the picture */
  sensitive: boolean
}

export interface ExifReport {
  container: Container
  findings: ExifFinding[]
  /** bytes of metadata that stripping would remove */
  bytes: number
  /** the pixels can be kept exactly as they are */
  lossless: boolean
}

// --- byte helpers -----------------------------------------------------------

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let text = ''
  for (let i = at; i < at + length && i < bytes.length; i++) text += String.fromCharCode(bytes[i])
  return text
}

function u16(bytes: Uint8Array, at: number, little: boolean): number {
  return little ? bytes[at] | (bytes[at + 1] << 8) : (bytes[at] << 8) | bytes[at + 1]
}

function u32(bytes: Uint8Array, at: number, little: boolean): number {
  return little
    ? (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
    : ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0
}

// --- TIFF, which is what EXIF actually is ----------------------------------

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

type Value = string | number | number[]

function readEntry(
  tiff: Uint8Array,
  at: number,
  little: boolean,
): { tag: number; value: Value } | null {
  const tag = u16(tiff, at, little)
  const type = u16(tiff, at + 2, little)
  const count = u32(tiff, at + 4, little)
  const size = TYPE_SIZE[type]
  if (!size || count > 10_000) return null

  const total = size * count
  const from = total <= 4 ? at + 8 : u32(tiff, at + 8, little)
  if (from + total > tiff.length) return null

  if (type === 2) return { tag, value: ascii(tiff, from, count).replace(/\0.*$/, '').trim() }
  if (type === 7 || type === 1) return { tag, value: count }

  const numbers: number[] = []
  for (let i = 0; i < count; i++) {
    const cell = from + i * size
    if (type === 3) numbers.push(u16(tiff, cell, little))
    else if (type === 4 || type === 9) numbers.push(u32(tiff, cell, little))
    else if (type === 5 || type === 10) {
      const denominator = u32(tiff, cell + 4, little)
      numbers.push(denominator ? u32(tiff, cell, little) / denominator : 0)
    }
  }
  return { tag, value: numbers.length === 1 ? numbers[0] : numbers }
}

function readIfd(tiff: Uint8Array, offset: number, little: boolean): Map<number, Value> {
  const found = new Map<number, Value>()
  if (offset + 2 > tiff.length) return found

  const count = u16(tiff, offset, little)
  for (let i = 0; i < count; i++) {
    const entry = readEntry(tiff, offset + 2 + i * 12, little)
    if (entry) found.set(entry.tag, entry.value)
  }
  return found
}

function degrees(parts: Value | undefined, ref: Value | undefined): string | null {
  if (!Array.isArray(parts) || parts.length < 3) return null
  const [d, m, s] = parts
  const sign = typeof ref === 'string' && /[SW]/i.test(ref) ? -1 : 1
  const value = sign * (d + m / 60 + s / 3600)
  return `${value.toFixed(6)}° ${typeof ref === 'string' ? ref.toUpperCase() : ''}`.trim()
}

const MAIN_TAGS: [number, string, boolean][] = [
  [0x010f, 'Camera make', true],
  [0x0110, 'Camera model', true],
  [0x0131, 'Software', true],
  [0x0132, 'Saved at', true],
  [0x010e, 'Description', false],
  [0x013b, 'Author', true],
  [0x8298, 'Copyright', true],
  [0x0112, 'Orientation', false],
]

const EXIF_TAGS: [number, string, boolean][] = [
  [0x9003, 'Taken at', true],
  [0xa434, 'Lens', true],
  [0xa433, 'Lens make', true],
  [0x9286, 'Comment', true],
  [0xa420, 'Image id', true],
  [0xa431, 'Camera serial', true],
  [0xa435, 'Lens serial', true],
  [0x8827, 'ISO', false],
  [0x829d, 'Aperture', false],
  [0x829a, 'Exposure', false],
]

function collect(tiff: Uint8Array): ExifFinding[] {
  const order = ascii(tiff, 0, 2)
  if (order !== 'II' && order !== 'MM') return []
  const little = order === 'II'
  if (u16(tiff, 2, little) !== 42) return []

  const findings: ExifFinding[] = []
  const main = readIfd(tiff, u32(tiff, 4, little), little)

  const push = (id: string, label: string, value: Value | undefined, sensitive: boolean) => {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) return
    findings.push({
      id,
      label,
      value: String(Array.isArray(value) ? value.join(', ') : value),
      sensitive,
    })
  }

  for (const [tag, label, sensitive] of MAIN_TAGS) push(`m${tag}`, label, main.get(tag), sensitive)

  const exifOffset = main.get(0x8769)
  if (typeof exifOffset === 'number') {
    const exif = readIfd(tiff, exifOffset, little)
    for (const [tag, label, sensitive] of EXIF_TAGS)
      push(`e${tag}`, label, exif.get(tag), sensitive)
    if (exif.has(0x927c)) {
      push('makernote', 'Maker notes', 'present — often holds a serial number', true)
    }
  }

  const gpsOffset = main.get(0x8825)
  if (typeof gpsOffset === 'number') {
    const gps = readIfd(tiff, gpsOffset, little)
    const latitude = degrees(gps.get(2), gps.get(1))
    const longitude = degrees(gps.get(4), gps.get(3))
    if (latitude && longitude) {
      findings.push({
        id: 'gps',
        label: 'Location',
        value: `${latitude}, ${longitude}`,
        sensitive: true,
      })
    }
    const altitude = gps.get(6)
    if (typeof altitude === 'number') {
      push('altitude', 'Altitude', `${Math.round(altitude)} m`, true)
    }
  }

  return findings
}

// --- containers -------------------------------------------------------------

export function containerOf(bytes: Uint8Array): Container {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return 'png'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  return 'other'
}

interface Block {
  /** what it is, in words */
  label: string
  from: number
  to: number
  /** a TIFF block that can be read for detail */
  tiff?: Uint8Array
}

/** Every stretch of metadata in a JPEG: EXIF, XMP, IPTC and comments. */
function jpegBlocks(bytes: Uint8Array): Block[] {
  const blocks: Block[] = []
  let at = 2

  while (at + 4 < bytes.length) {
    if (bytes[at] !== 0xff) break
    const marker = bytes[at + 1]
    if (marker === 0xda) break // start of scan: pixels from here on
    const length = u16(bytes, at + 2, false)
    const from = at
    const to = at + 2 + length

    if (marker === 0xe1) {
      if (ascii(bytes, at + 4, 4) === 'Exif') {
        blocks.push({ label: 'EXIF', from, to, tiff: bytes.subarray(at + 10, to) })
      } else if (ascii(bytes, at + 4, 4) === 'http') {
        blocks.push({ label: 'XMP', from, to })
      }
    } else if (marker === 0xed) {
      blocks.push({ label: 'IPTC', from, to })
    } else if (marker === 0xee) {
      blocks.push({ label: 'Adobe tag', from, to })
    } else if (marker === 0xfe) {
      blocks.push({ label: 'Comment', from, to })
    }
    at = to
  }
  return blocks
}

function pngBlocks(bytes: Uint8Array): Block[] {
  const blocks: Block[] = []
  let at = 8

  while (at + 8 <= bytes.length) {
    const length = u32(bytes, at, false)
    const type = ascii(bytes, at + 4, 4)
    const to = at + 12 + length
    if (type === 'IEND' || to > bytes.length) break

    if (type === 'eXIf') {
      blocks.push({ label: 'EXIF', from: at, to, tiff: bytes.subarray(at + 8, at + 8 + length) })
    } else if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      blocks.push({ label: 'Text', from: at, to })
    } else if (type === 'tIME') {
      blocks.push({ label: 'Saved at', from: at, to })
    }
    at = to
  }
  return blocks
}

function webpBlocks(bytes: Uint8Array): Block[] {
  const blocks: Block[] = []
  let at = 12

  while (at + 8 <= bytes.length) {
    const type = ascii(bytes, at, 4)
    const length = u32(bytes, at + 4, true)
    const to = at + 8 + length + (length % 2) // chunks are padded to even
    if (to > bytes.length) break

    if (type === 'EXIF') {
      const start = ascii(bytes, at + 8, 4) === 'Exif' ? at + 14 : at + 8
      blocks.push({ label: 'EXIF', from: at, to, tiff: bytes.subarray(start, at + 8 + length) })
    } else if (type === 'XMP ') {
      blocks.push({ label: 'XMP', from: at, to })
    }
    at = to
  }
  return blocks
}

function blocksOf(bytes: Uint8Array, container: Container): Block[] {
  if (container === 'jpeg') return jpegBlocks(bytes)
  if (container === 'png') return pngBlocks(bytes)
  if (container === 'webp') return webpBlocks(bytes)
  return []
}

// --- reading ----------------------------------------------------------------

export function readExifBytes(bytes: Uint8Array): ExifReport {
  const container = containerOf(bytes)
  const blocks = blocksOf(bytes, container)
  const findings: ExifFinding[] = []

  for (const block of blocks) {
    if (block.tiff) findings.push(...collect(block.tiff))
    else {
      findings.push({
        id: `${block.label}-${block.from}`,
        label: block.label,
        value: `${block.to - block.from} bytes of hidden text`,
        sensitive: block.label !== 'Comment',
      })
    }
  }

  return {
    container,
    findings,
    bytes: blocks.reduce((sum, block) => sum + (block.to - block.from), 0),
    lossless: container !== 'other',
  }
}

export async function readExif(file: File): Promise<ExifReport> {
  return readExifBytes(new Uint8Array(await file.arrayBuffer()))
}

// --- stripping --------------------------------------------------------------

function without(bytes: Uint8Array, blocks: Block[]): Uint8Array {
  const kept = new Uint8Array(bytes.length - blocks.reduce((n, b) => n + (b.to - b.from), 0))
  let write = 0
  let read = 0

  for (const block of blocks) {
    kept.set(bytes.subarray(read, block.from), write)
    write += block.from - read
    read = block.to
  }
  kept.set(bytes.subarray(read), write)
  return kept
}

/** Clears the "has EXIF" and "has XMP" flags a WebP header may advertise. */
function clearWebpFlags(bytes: Uint8Array) {
  if (ascii(bytes, 12, 4) !== 'VP8X') return
  bytes[20] &= ~0b0000_1100
}

export function stripExifBytes(bytes: Uint8Array): Uint8Array {
  const container = containerOf(bytes)
  const blocks = blocksOf(bytes, container)
  if (!blocks.length) return bytes

  const kept = without(bytes, blocks)
  if (container === 'webp') {
    // the RIFF header counts everything after the first 8 bytes
    const size = kept.length - 8
    kept[4] = size & 0xff
    kept[5] = (size >> 8) & 0xff
    kept[6] = (size >> 16) & 0xff
    kept[7] = (size >> 24) & 0xff
    clearWebpFlags(kept)
  }
  return kept
}

// --- the operation ----------------------------------------------------------

/**
 * Removes every block of metadata. JPEG, PNG and WebP are rewritten around
 * their own pixels, so the picture is untouched and the file only gets
 * smaller. Anything else has to go through the canvas, which re-encodes.
 */
export async function stripMetadata(files: File[], onProgress?: Progress): Promise<OutputFile[]> {
  const out: OutputFile[] = []

  for (const [index, file] of files.entries()) {
    onProgress?.(index, files.length, file.name)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const report = readExifBytes(bytes)
    const name = renameWithExt(file.name, file.type || 'image/jpeg', '-clean')

    if (report.lossless) {
      const cleaned = stripExifBytes(bytes)
      out.push({
        file: new File([cleaned as BlobPart], name, { type: file.type }),
        sourceName: file.name,
        sourceSize: file.size,
        note: report.findings.length ? `${report.findings.length} removed` : 'nothing found',
      })
      continue
    }

    // an unfamiliar container: the canvas keeps the pixels and drops the rest
    const { runTransform } = await import('./pool')
    const result = await runTransform(file, { format: 'keep', quality: 0.95 })
    out.push({
      file: new File([result.blob], renameWithExt(file.name, result.blob.type, '-clean'), {
        type: result.blob.type,
      }),
      sourceName: file.name,
      sourceSize: file.size,
      width: result.width,
      height: result.height,
      warning: 'This format had to be re-encoded, so the picture is not bit for bit identical.',
    })
  }

  onProgress?.(files.length, files.length, 'Done')
  return out
}
