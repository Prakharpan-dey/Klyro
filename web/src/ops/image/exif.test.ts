import { describe, expect, it } from 'vitest'
import { containerOf, readExifBytes, stripExifBytes } from './exif'

/**
 * Fixtures are built by hand rather than checked in as photos: a real holiday
 * snap would carry someone's actual coordinates, and the point of the tool is
 * that those do not travel.
 */

const enc = new TextEncoder()

interface Entry {
  tag: number
  type: number
  values: (number | string | [number, number])[]
}

/** Writes a little-endian TIFF block with a main IFD and, if asked, a GPS one. */
function tiff(main: Entry[], gps: Entry[] = []): Uint8Array {
  const header = 8
  // lay the IFDs out one after the other, then the values they point at
  const mainSize = 2 + main.length * 12 + 4
  const gpsSize = gps.length ? 2 + gps.length * 12 + 4 : 0
  const gpsAt = header + mainSize
  const heapAt = gpsAt + gpsSize

  const heap: number[] = []
  const bytes = new Uint8Array(4096)
  const view = new DataView(bytes.buffer)

  bytes.set(enc.encode('II'), 0)
  view.setUint16(2, 42, true)
  view.setUint32(4, header, true)

  const writeIfd = (entries: Entry[], at: number) => {
    view.setUint16(at, entries.length, true)
    entries.forEach((entry, i) => {
      const cell = at + 2 + i * 12
      view.setUint16(cell, entry.tag, true)
      view.setUint16(cell + 2, entry.type, true)

      if (entry.type === 2) {
        const text = `${entry.values[0]}\0`
        view.setUint32(cell + 4, text.length, true)
        if (text.length <= 4) bytes.set(enc.encode(text), cell + 8)
        else {
          view.setUint32(cell + 8, heapAt + heap.length, true)
          heap.push(...enc.encode(text))
        }
      } else if (entry.type === 5) {
        view.setUint32(cell + 4, entry.values.length, true)
        view.setUint32(cell + 8, heapAt + heap.length, true)
        for (const value of entry.values as [number, number][]) {
          const pair = new Uint8Array(8)
          new DataView(pair.buffer).setUint32(0, value[0], true)
          new DataView(pair.buffer).setUint32(4, value[1], true)
          heap.push(...pair)
        }
      } else {
        view.setUint32(cell + 4, 1, true)
        view.setUint32(cell + 8, entry.values[0] as number, true)
      }
    })
    view.setUint32(at + 2 + entries.length * 12, 0, true)
  }

  writeIfd(main, header)
  if (gps.length) writeIfd(gps, gpsAt)
  bytes.set(heap, heapAt)
  return bytes.subarray(0, heapAt + heap.length)
}

function jpeg(blocks: { marker: number; body: Uint8Array }[], pixels = 'PIXELDATA'): Uint8Array {
  const parts: number[] = [0xff, 0xd8]
  for (const block of blocks) {
    const length = block.body.length + 2
    parts.push(0xff, block.marker, (length >> 8) & 0xff, length & 0xff, ...block.body)
  }
  // start of scan, then the pixels, then end of image
  parts.push(0xff, 0xda, 0x00, 0x02, ...enc.encode(pixels), 0xff, 0xd9)
  return new Uint8Array(parts)
}

function app1(block: Uint8Array): { marker: number; body: Uint8Array } {
  return { marker: 0xe1, body: new Uint8Array([...enc.encode('Exif\0\0'), ...block]) }
}

const camera = tiff(
  [
    { tag: 0x010f, type: 2, values: ['Xiaomi'] },
    { tag: 0x0110, type: 2, values: ['Redmi Note 12'] },
    { tag: 0x0132, type: 2, values: ['2026:09:14 18:22:07'] },
    { tag: 0x013b, type: 2, values: ['Asha Verma'] },
    { tag: 0x8825, type: 4, values: [0] }, // patched below
  ],
  [
    { tag: 1, type: 2, values: ['N'] },
    {
      tag: 2,
      type: 5,
      values: [
        [18, 1],
        [31, 1],
        [12, 1],
      ],
    },
    { tag: 3, type: 2, values: ['E'] },
    {
      tag: 4,
      type: 5,
      values: [
        [73, 1],
        [51, 1],
        [30, 1],
      ],
    },
  ],
)
// point the GPS pointer at the second IFD, which sits right after the first
new DataView(camera.buffer, camera.byteOffset).setUint32(
  8 + 2 + 4 * 12 + 8,
  8 + 2 + 5 * 12 + 4,
  true,
)

describe('containerOf', () => {
  it('knows the three formats it can rewrite', () => {
    expect(containerOf(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('jpeg')
    expect(containerOf(new Uint8Array([0x89, ...enc.encode('PNG')]))).toBe('png')
    expect(containerOf(enc.encode('RIFF....WEBPVP8 '))).toBe('webp')
    expect(containerOf(enc.encode('GIF89a'))).toBe('other')
  })
})

describe('readExifBytes', () => {
  const photo = jpeg([app1(camera)])

  it('reads the camera and the owner out of a JPEG', () => {
    const report = readExifBytes(photo)
    const labels = report.findings.map((f) => f.label)

    expect(report.container).toBe('jpeg')
    expect(labels).toContain('Camera make')
    expect(labels).toContain('Camera model')
    expect(labels).toContain('Author')
    expect(report.findings.find((f) => f.label === 'Camera model')?.value).toBe('Redmi Note 12')
    expect(report.findings.find((f) => f.label === 'Author')?.value).toBe('Asha Verma')
  })

  it('works out where the photo was taken', () => {
    const location = readExifBytes(photo).findings.find((f) => f.label === 'Location')
    expect(location).toBeDefined()
    // 18°31'12" N, 73°51'30" E — Pune
    expect(location!.value).toContain('18.520000° N')
    expect(location!.value).toContain('73.858333° E')
    expect(location!.sensitive).toBe(true)
  })

  it('counts a comment and an XMP block as metadata too', () => {
    const withText = jpeg([
      app1(camera),
      { marker: 0xfe, body: enc.encode('shot on the roof') },
      { marker: 0xe1, body: enc.encode('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>') },
    ])
    const labels = readExifBytes(withText).findings.map((f) => f.label)
    expect(labels).toContain('Comment')
    expect(labels).toContain('XMP')
  })

  it('finds nothing in a photo that carries nothing', () => {
    const report = readExifBytes(jpeg([]))
    expect(report.findings).toEqual([])
    expect(report.bytes).toBe(0)
  })

  it('reads a PNG eXIf chunk', () => {
    const chunk = (type: string, body: Uint8Array) => {
      const out = new Uint8Array(12 + body.length)
      new DataView(out.buffer).setUint32(0, body.length, false)
      out.set(enc.encode(type), 4)
      out.set(body, 8)
      return out
    }
    const png = new Uint8Array([
      0x89,
      ...enc.encode('PNG\r\n\x1a\n'),
      ...chunk('eXIf', camera),
      ...chunk('IEND', new Uint8Array()),
    ])
    const report = readExifBytes(png)
    expect(report.container).toBe('png')
    expect(report.findings.map((f) => f.label)).toContain('Camera make')
  })
})

describe('stripExifBytes', () => {
  it('removes the metadata and leaves the picture untouched', () => {
    const photo = jpeg([app1(camera), { marker: 0xfe, body: enc.encode('note') }])
    const clean = stripExifBytes(photo)

    expect(readExifBytes(clean).findings).toEqual([])
    expect(clean.length).toBeLessThan(photo.length)
    // the scan segment and everything after it survives byte for byte
    const scan = (bytes: Uint8Array) => bytes.subarray(bytes.indexOf(0xda) - 1)
    expect([...scan(clean)]).toEqual([...scan(photo)])
    expect(clean[0]).toBe(0xff)
    expect(clean[1]).toBe(0xd8)
  })

  it('leaves a clean photo exactly as it was', () => {
    const photo = jpeg([])
    expect(stripExifBytes(photo)).toBe(photo)
  })

  it('keeps a PNG readable after removing its text', () => {
    const chunk = (type: string, body: Uint8Array) => {
      const out = new Uint8Array(12 + body.length)
      new DataView(out.buffer).setUint32(0, body.length, false)
      out.set(enc.encode(type), 4)
      out.set(body, 8)
      return out
    }
    const png = new Uint8Array([
      0x89,
      ...enc.encode('PNG\r\n\x1a\n'),
      ...chunk('IHDR', new Uint8Array(13)),
      ...chunk('tEXt', enc.encode('Author\0Asha')),
      ...chunk('IDAT', enc.encode('pixels')),
      ...chunk('IEND', new Uint8Array()),
    ])
    const clean = stripExifBytes(png)

    expect(readExifBytes(clean).findings).toEqual([])
    expect(new TextDecoder('latin1').decode(clean)).toContain('IDAT')
    expect(new TextDecoder('latin1').decode(clean)).not.toContain('Asha')
  })
})
