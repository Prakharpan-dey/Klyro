import { degrees, PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { boxPoint, editPdf, hexToRgb, itemBox, moveItem, wrapLines, type EditItem } from './edit'
import { placeImage } from './stamp'

/**
 * Where a point in page space appears to a reader, as fractions from the top
 * left of the page they see. Written independently of `placeImage`, from what
 * /Rotate means: the page is shown turned clockwise by that much.
 */
function seen(x: number, y: number, w: number, h: number, rotation: number) {
  if (rotation === 90) return { x: y / h, y: x / w }
  if (rotation === 180) return { x: 1 - x / w, y: y / h }
  if (rotation === 270) return { x: 1 - y / h, y: 1 - x / w }
  return { x: x / w, y: 1 - y / h }
}

describe('boxPoint', () => {
  for (const rotation of [0, 90, 180, 270]) {
    it(`keeps the box where the reader put it on a page turned ${rotation}°`, async () => {
      const doc = await PDFDocument.create()
      const page = doc.addPage([400, 600])
      page.setRotation(degrees(rotation))
      const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.25 }
      const spot = placeImage(page, box)

      // the box's own frame: x across, y up, from its bottom-left as seen
      const corners = [
        [0, 0, box.x, box.y + box.h],
        [spot.width, 0, box.x + box.w, box.y + box.h],
        [0, spot.height, box.x, box.y],
        [spot.width, spot.height, box.x + box.w, box.y],
      ]
      for (const [lx, ly, fx, fy] of corners) {
        const point = boxPoint(spot, lx, ly)
        const view = seen(point.x, point.y, 400, 600, rotation)
        expect(view.x).toBeCloseTo(fx, 6)
        expect(view.y).toBeCloseTo(fy, 6)
      }
    })
  }
})

describe('wrapLines', () => {
  // every character is 1 wide, so widths are easy to reason about
  const measure = (line: string) => line.length

  it('wraps at spaces to fit the width', () => {
    expect(wrapLines('the quick brown fox', measure, 10)).toEqual(['the quick', 'brown fox'])
  })

  it('keeps the line breaks that were typed, blank lines included', () => {
    expect(wrapLines('one\n\ntwo', measure, 20)).toEqual(['one', '', 'two'])
  })

  it('breaks a word too long for the box', () => {
    expect(wrapLines('abcdefghij', measure, 4)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('leaves a short line alone', () => {
    expect(wrapLines('hello', measure, 50)).toEqual(['hello'])
  })
})

describe('moving items', () => {
  const rect: EditItem = {
    id: 'a',
    kind: 'rect',
    page: 0,
    box: { x: 0.8, y: 0.1, w: 0.15, h: 0.1 },
    stroke: '#000000',
    width: 1,
  }

  it('moves a box by the fraction asked', () => {
    const moved = moveItem(rect, -0.1, 0.2)
    expect(itemBox(moved).x).toBeCloseTo(0.7)
    expect(itemBox(moved).y).toBeCloseTo(0.3)
  })

  it('stops at the edge of the page', () => {
    const moved = moveItem(rect, 0.5, -0.5)
    expect(itemBox(moved).x).toBeCloseTo(0.85)
    expect(itemBox(moved).y).toBe(0)
  })

  it('moves both ends of a line together', () => {
    const line: EditItem = {
      id: 'l',
      kind: 'line',
      page: 0,
      from: { x: 0.5, y: 0.5 },
      to: { x: 0.2, y: 0.6 },
      stroke: '#000000',
      width: 2,
    }
    expect(itemBox(line)).toEqual({ x: 0.2, y: 0.5, w: 0.3, h: expect.closeTo(0.1) })
    const moved = moveItem(line, 0.1, 0)
    expect(moved.kind === 'line' && moved.from.x).toBeCloseTo(0.6)
    expect(moved.kind === 'line' && moved.to.x).toBeCloseTo(0.3)
  })
})

describe('hexToRgb', () => {
  it('reads a colour picker value', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 })
  })
})

describe('editPdf', () => {
  it('adds one of everything and keeps the pages', async () => {
    const source = await PDFDocument.create()
    source.addPage([595, 842])
    source.addPage([842, 595]).setRotation(degrees(90))
    const file = new File([(await source.save()) as BlobPart], 'form.pdf', {
      type: 'application/pdf',
    })

    const box = { x: 0.1, y: 0.1, w: 0.4, h: 0.1 }
    const items: EditItem[] = [
      {
        id: '1',
        kind: 'text',
        page: 0,
        box,
        text: 'Paid in full — thank you',
        size: 14,
        font: 'helvetica',
        bold: true,
        colour: '#1a1a1a',
      },
      { id: '2', kind: 'whiteout', page: 0, box: { ...box, y: 0.5 } },
      { id: '3', kind: 'rect', page: 1, box, stroke: '#cc0000', width: 2 },
      { id: '4', kind: 'ellipse', page: 1, box, stroke: '#0000cc', fill: '#ccccff', width: 1 },
      {
        id: '5',
        kind: 'line',
        page: 1,
        from: { x: 0.1, y: 0.9 },
        to: { x: 0.9, y: 0.9 },
        stroke: '#000000',
        width: 1,
      },
    ]

    const out = await editPdf(file, items)
    const reread = await PDFDocument.load(await out.file.arrayBuffer())
    expect(reread.getPageCount()).toBe(2)
    expect(reread.getPage(1).getRotation().angle).toBe(90)
    expect(out.file.name).toBe('form-edited.pdf')
    expect(out.note).toBe('5 items added')
    expect(out.warning).toBeUndefined()
  })

  it('says how much text the standard fonts could not draw', async () => {
    const source = await PDFDocument.create()
    source.addPage()
    const file = new File([(await source.save()) as BlobPart], 'a.pdf')
    const out = await editPdf(file, [
      {
        id: 't',
        kind: 'text',
        page: 0,
        box: { x: 0, y: 0, w: 0.5, h: 0.1 },
        text: 'Name: नमस्ते',
        size: 12,
        font: 'times',
        bold: false,
        colour: '#000000',
      },
    ])
    expect(out.warning).toMatch(/^6 characters were left out/)
  })
})
