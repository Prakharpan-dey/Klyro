import { deflateSync } from 'node:zlib'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { redrawSize, surveyImages } from './extractImages'

/**
 * The smallest JPEG pdf-lib will embed: it reads the frame header for the size
 * and the colour count and copies the rest, so no picture data is needed.
 */
function jpeg(width: number, height: number, marker = 0): Uint8Array {
  // prettier-ignore
  return new Uint8Array([
    0xff, 0xd8,
    // a comment, so two "photos" of the same size are different bytes
    0xff, 0xfe, 0x00, 0x03, marker,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ])
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function chunk(type: string, data: Uint8Array): number[] {
  const body = [...type].map((ch) => ch.charCodeAt(0)).concat([...data])
  let crc = 0xffffffff
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  crc = (crc ^ 0xffffffff) >>> 0
  const u32 = (n: number) => [n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
  return [...u32(data.length), ...body, ...u32(crc)]
}

/** A flat grey PNG, built by hand because tests run without a canvas. */
function png(width: number, height: number): Uint8Array {
  // prettier-ignore
  const header = new Uint8Array([
    width >>> 24, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    height >>> 24, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    8, 0, 0, 0, 0,
  ])
  const rows = new Uint8Array(height * (width + 1)).fill(128)
  for (let y = 0; y < height; y++) rows[y * (width + 1)] = 0
  // prettier-ignore
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', header),
    ...chunk('IDAT', deflateSync(rows)),
    ...chunk('IEND', new Uint8Array()),
  ])
}

async function pdfWith(draw: (doc: PDFDocument) => Promise<void>) {
  const doc = await PDFDocument.create()
  await draw(doc)
  return PDFDocument.load(await doc.save())
}

describe('surveyImages', () => {
  it('hands a plain JPEG back byte for byte', async () => {
    const photo = jpeg(640, 480)
    const doc = await pdfWith(async (d) => {
      const image = await d.embedJpg(photo)
      d.addPage().drawImage(image, { x: 0, y: 0, width: 100, height: 75 })
    })

    const { images } = await surveyImages(doc, 24)
    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({ page: 0, width: 640, height: 480 })
    expect(images[0].jpeg).toEqual(photo)
  })

  it('sends a non-JPEG image to be redrawn', async () => {
    const doc = await pdfWith(async (d) => {
      const image = await d.embedPng(png(40, 30))
      d.addPage().drawImage(image, { x: 0, y: 0, width: 40, height: 30 })
    })

    const { images } = await surveyImages(doc, 24)
    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({ width: 40, height: 30, jpeg: undefined })
  })

  it('lists a logo on every page once, at the page it first appears', async () => {
    const doc = await pdfWith(async (d) => {
      const logo = await d.embedPng(png(48, 48))
      const photo = await d.embedJpg(jpeg(300, 200))
      for (let i = 0; i < 3; i++) d.addPage().drawImage(logo, { x: 0, y: 0, width: 48, height: 48 })
      d.getPage(2).drawImage(photo, { x: 50, y: 50, width: 150, height: 100 })
    })

    const { images } = await surveyImages(doc, 24)
    expect(images.map((image) => [image.page, image.width])).toEqual([
      [0, 48],
      [2, 300],
    ])
  })

  it('skips images too small to be a picture, and counts them', async () => {
    const doc = await pdfWith(async (d) => {
      const dot = await d.embedPng(png(8, 8))
      const photo = await d.embedJpg(jpeg(64, 64, 1))
      const page = d.addPage()
      page.drawImage(dot, { x: 0, y: 0, width: 8, height: 8 })
      page.drawImage(photo, { x: 10, y: 10, width: 64, height: 64 })
    })

    const survey = await surveyImages(doc, 24)
    expect(survey.images).toHaveLength(1)
    expect(survey.skipped).toBe(1)
    expect((await surveyImages(doc, 1)).images).toHaveLength(2)
  })

  it('finds images inside a form XObject', async () => {
    const source = await pdfWith(async (d) => {
      const photo = await d.embedJpg(jpeg(120, 90))
      d.addPage([200, 200]).drawImage(photo, { x: 0, y: 0, width: 120, height: 90 })
    })
    // embedding a page wraps everything on it, image included, in a form
    const doc = await pdfWith(async (d) => {
      const [form] = await d.embedPdf(await source.save())
      d.addPage().drawPage(form)
    })

    const { images } = await surveyImages(doc, 24)
    expect(images).toHaveLength(1)
    expect(images[0].width).toBe(120)
  })

  it('reports an empty survey for a PDF with no pictures', async () => {
    const doc = await pdfWith(async (d) => {
      d.addPage().drawText('only words')
    })
    expect(await surveyImages(doc, 24)).toEqual({ images: [], skipped: 0 })
  })
})

describe('redrawSize', () => {
  it('keeps an ordinary image at its own size', () => {
    expect(redrawSize(4000, 3000)).toEqual({ width: 4000, height: 3000, reduced: false })
  })

  it('scales a huge one down to what a canvas can take, keeping its shape', () => {
    const size = redrawSize(20_000, 10_000)
    expect(size.reduced).toBe(true)
    expect(size.width * size.height).toBeLessThanOrEqual(40_000_000)
    expect(size.width / size.height).toBeCloseTo(2, 2)
  })
})
