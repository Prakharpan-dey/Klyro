import { PDFDocument, degrees } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import {
  anchorPosition,
  assertLatin,
  fillTemplate,
  mmToPt,
  placeImage,
  stampText,
  UnsupportedTextError,
} from './stamp'

async function page(width = 400, height = 600) {
  const doc = await PDFDocument.create()
  return doc.addPage([width, height])
}

async function makePdf(pages = 2): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([400, 600])
  return new File([(await doc.save()) as BlobPart], 'doc.pdf', { type: 'application/pdf' })
}

describe('mmToPt', () => {
  it('converts millimetres to points', () => {
    expect(Math.round(mmToPt(25.4))).toBe(72)
  })
})

describe('anchorPosition', () => {
  it('places a box in each corner inside the margin', async () => {
    const p = await page()
    const box = { w: 100, h: 20 }
    const margin = 10
    expect(anchorPosition(p, box.w, box.h, 'bottom-left', margin)).toEqual({ x: 10, y: 10 })
    expect(anchorPosition(p, box.w, box.h, 'top-left', margin)).toEqual({ x: 10, y: 570 })
    expect(anchorPosition(p, box.w, box.h, 'top-right', margin)).toEqual({ x: 290, y: 570 })
    expect(anchorPosition(p, box.w, box.h, 'bottom-right', margin)).toEqual({ x: 290, y: 10 })
  })

  it('centres horizontally and fully', async () => {
    const p = await page()
    expect(anchorPosition(p, 100, 20, 'bottom-center', 10)).toEqual({ x: 150, y: 10 })
    expect(anchorPosition(p, 100, 20, 'center', 10)).toEqual({ x: 150, y: 290 })
  })
})

describe('fillTemplate', () => {
  it('replaces page tokens', () => {
    expect(fillTemplate('Page {n} of {total}', 2, 7)).toBe('Page 2 of 7')
    expect(fillTemplate('{n}/{total}', 1, 3)).toBe('1/3')
  })

  it('leaves unknown tokens alone', () => {
    expect(fillTemplate('draft {x}', 1, 1)).toBe('draft {x}')
  })
})

describe('assertLatin', () => {
  it('accepts Latin text and rejects other scripts', () => {
    expect(() => assertLatin('Marksheet 2026 - Page 1')).not.toThrow()
    expect(() => assertLatin('नमस्ते')).toThrow(UnsupportedTextError)
  })
})

describe('stampText', () => {
  it('keeps the page count and adds content', async () => {
    const source = await makePdf(3)
    const out = await stampText(source, {
      textFor: (i, count) => `Page ${i + 1} of ${count}`,
      anchor: 'bottom-center',
      family: 'helvetica',
      size: 11,
      marginMm: 12,
      suffix: '-numbered',
    })
    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(3)
    expect(out.file.size).toBeGreaterThan(source.size)
    expect(out.file.name).toBe('doc-numbered.pdf')
    expect(out.note).toBe('3 pp')
  })

  it('skips pages whose text is empty', async () => {
    const source = await makePdf(2)
    const all = await stampText(source, {
      textFor: () => 'stamp',
      anchor: 'top-left',
      family: 'courier',
      size: 10,
      marginMm: 10,
      suffix: '-a',
    })
    const firstOnly = await stampText(source, {
      textFor: (i) => (i === 0 ? 'stamp' : ''),
      anchor: 'top-left',
      family: 'courier',
      size: 10,
      marginMm: 10,
      suffix: '-b',
    })
    expect(firstOnly.file.size).toBeLessThan(all.file.size)
  })

  it('only stamps the pages it is given', async () => {
    const source = await makePdf(4)
    const one = await stampText(source, {
      pages: [1],
      textFor: () => 'stamp',
      anchor: 'top-left',
      family: 'courier',
      size: 10,
      marginMm: 10,
      suffix: '-one',
    })
    const every = await stampText(source, {
      textFor: () => 'stamp',
      anchor: 'top-left',
      family: 'courier',
      size: 10,
      marginMm: 10,
      suffix: '-every',
    })
    expect(one.file.size).toBeLessThan(every.file.size)
  })

  it('surfaces unsupported characters', async () => {
    const source = await makePdf(1)
    await expect(
      stampText(source, {
        textFor: () => 'नमस्ते',
        anchor: 'center',
        family: 'helvetica',
        size: 20,
        marginMm: 0,
        suffix: '-x',
      }),
    ).rejects.toThrow(/Latin/)
  })
})

describe('placeImage', () => {
  /** A page of a given size, optionally turned or cropped. */
  async function sheet(width: number, height: number, turn = 0, origin = 0) {
    const doc = await PDFDocument.create()
    const p = doc.addPage([width, height])
    if (turn) p.setRotation(degrees(turn))
    if (origin) p.setCropBox(origin, origin, width, height)
    return p
  }

  const round = (p: { x: number; y: number; width: number; height: number; rotate: number }) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
    width: Math.round(p.width),
    height: Math.round(p.height),
    rotate: p.rotate,
  })

  it('covers the whole page when the box does', async () => {
    expect(round(placeImage(await sheet(400, 600), { x: 0, y: 0, w: 1, h: 1 }))).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 600,
      rotate: 0,
    })
  })

  it('puts a top-left box at the top left, where the reader sees it', async () => {
    // a quarter box at the top-left corner: in PDF space that is high up
    const spot = round(placeImage(await sheet(400, 600), { x: 0, y: 0, w: 0.5, h: 0.5 }))
    expect(spot).toEqual({ x: 0, y: 300, width: 200, height: 300, rotate: 0 })
  })

  it('puts a bottom-right box at the bottom right', async () => {
    const spot = round(placeImage(await sheet(400, 600), { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }))
    expect(spot).toEqual({ x: 200, y: 0, width: 200, height: 300, rotate: 0 })
  })

  it('measures against the page as it is seen, not as it is stored', async () => {
    // turned a quarter: the reader sees 600 wide by 400 tall
    const spot = round(placeImage(await sheet(400, 600, 90), { x: 0, y: 0, w: 0.5, h: 0.5 }))
    expect(spot.width).toBe(300)
    expect(spot.height).toBe(200)
    expect(spot.rotate).toBe(90)
  })

  it('turns the stamp with the page, so it never lands sideways', async () => {
    for (const turn of [0, 90, 180, 270]) {
      const spot = placeImage(await sheet(400, 600, turn), { x: 0.1, y: 0.1, w: 0.3, h: 0.2 })
      expect(spot.rotate).toBe(turn)
      expect(spot.x).toBeGreaterThanOrEqual(0)
      expect(spot.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('follows a crop box that does not start at the corner', async () => {
    const plain = placeImage(await sheet(400, 600), { x: 0.25, y: 0.25, w: 0.5, h: 0.5 })
    const offset = placeImage(await sheet(400, 600, 0, 20), { x: 0.25, y: 0.25, w: 0.5, h: 0.5 })
    expect(Math.round(offset.x - plain.x)).toBe(20)
    expect(Math.round(offset.y - plain.y)).toBe(20)
  })
})
