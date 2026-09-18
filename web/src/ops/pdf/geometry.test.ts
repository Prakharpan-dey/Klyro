import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import {
  bookletOrder,
  cropPages,
  dividePages,
  fitScale,
  gridFor,
  makeBooklet,
  overlayPdf,
  pagesPerSheet,
  resizePages,
  sheetSize,
} from './geometry'

async function makePdf(name: string, pages: number, width = 400, height = 560): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([width, height])
  return new File([(await doc.save()) as BlobPart], name, { type: 'application/pdf' })
}

async function load(file: File) {
  return PDFDocument.load(await file.arrayBuffer())
}

describe('sheetSize and fitScale', () => {
  it('swaps sides for landscape', () => {
    const [w, h] = sheetSize('a4', 'portrait')
    expect(sheetSize('a4', 'landscape')).toEqual([h, w])
  })

  it('fits inside the box on the tighter axis', () => {
    expect(fitScale({ width: 200, height: 100 }, { width: 100, height: 100 })).toBe(0.5)
    expect(fitScale({ width: 50, height: 50 }, { width: 100, height: 100 }, false)).toBe(1)
  })
})

describe('gridFor', () => {
  it('lays out each supported count', () => {
    expect(gridFor(2)).toEqual({ cols: 1, rows: 2 })
    expect(gridFor(4)).toEqual({ cols: 2, rows: 2 })
    expect(gridFor(6)).toEqual({ cols: 2, rows: 3 })
    expect(gridFor(9)).toEqual({ cols: 3, rows: 3 })
  })
})

describe('bookletOrder', () => {
  it('puts the last page beside the first', () => {
    expect(bookletOrder(8)).toEqual([7, 0, 1, 6, 5, 2, 3, 4])
  })

  it('leaves gaps blank when the count is not a multiple of four', () => {
    expect(bookletOrder(6)).toEqual([null, 0, 1, null, 5, 2, 3, 4])
  })

  it('uses every page exactly once', () => {
    const used = bookletOrder(12).filter((p): p is number => p !== null)
    expect([...used].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})

describe('cropPages', () => {
  it('shrinks the crop box by the given margins', async () => {
    const out = await cropPages(await makePdf('a.pdf', 2), {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    })
    const box = (await load(out.file)).getPage(0).getCropBox()
    // 10 mm is about 28.35 pt on each side
    expect(Math.round(box.width)).toBe(343)
    expect(Math.round(box.height)).toBe(503)
    expect(Math.round(box.x)).toBe(28)
  })

  it('refuses margins that would erase the page', async () => {
    await expect(
      cropPages(await makePdf('a.pdf', 1), { top: 200, right: 0, bottom: 200, left: 0 }),
    ).rejects.toThrow(/whole page/)
  })
})

describe('resizePages', () => {
  it('puts every page on one sheet size, following orientation', async () => {
    const out = await resizePages(await makePdf('wide.pdf', 2, 800, 560), {
      size: 'a4',
      orientation: 'auto',
      marginMm: 5,
    })
    const pages = (await load(out.file)).getPages()
    expect(pages.map((p) => Math.round(p.getWidth()))).toEqual([842, 842])
    expect(pages.map((p) => Math.round(p.getHeight()))).toEqual([595, 595])
  })
})

describe('pagesPerSheet', () => {
  it('packs pages onto the right number of sheets', async () => {
    const out = await pagesPerSheet(await makePdf('doc.pdf', 8), {
      perSheet: 4,
      size: 'a4',
      orientation: 'portrait',
      marginMm: 8,
      gapMm: 4,
    })
    const doc = await load(out.file)
    expect(doc.getPageCount()).toBe(2)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595)
  })

  it('leaves a partly filled last sheet', async () => {
    const out = await pagesPerSheet(await makePdf('doc.pdf', 5), {
      perSheet: 4,
      size: 'a4',
      orientation: 'portrait',
      marginMm: 8,
      gapMm: 4,
    })
    expect((await load(out.file)).getPageCount()).toBe(2)
  })
})

describe('makeBooklet', () => {
  it('writes two pages per landscape sheet', async () => {
    const out = await makeBooklet(await makePdf('doc.pdf', 8), 'a4')
    const doc = await load(out.file)
    expect(doc.getPageCount()).toBe(4)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(842)
  })
})

describe('dividePages', () => {
  it('halves pages vertically', async () => {
    const out = await dividePages(await makePdf('wide.pdf', 2, 800, 560), 'vertical')
    const doc = await load(out.file)
    expect(doc.getPageCount()).toBe(4)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(400)
    expect(Math.round(doc.getPage(0).getHeight())).toBe(560)
  })

  it('quarters pages', async () => {
    const out = await dividePages(await makePdf('a.pdf', 1, 800, 560), 'quarters')
    const doc = await load(out.file)
    expect(doc.getPageCount()).toBe(4)
    expect(Math.round(doc.getPage(0).getHeight())).toBe(280)
  })
})

describe('overlayPdf', () => {
  it('keeps the base page count and needs two files', async () => {
    const base = await makePdf('base.pdf', 3)
    const layer = await makePdf('layer.pdf', 1)
    const out = await overlayPdf([base, layer], { mode: 'first', opacity: 0.4, scale: 1 })
    expect((await load(out.file)).getPageCount()).toBe(3)
    await expect(overlayPdf([base], { mode: 'first', opacity: 1, scale: 1 })).rejects.toThrow(
      /base PDF/,
    )
  })

  it('stops when the overlay runs out of pages in sequence mode', async () => {
    const out = await overlayPdf([await makePdf('base.pdf', 4), await makePdf('layer.pdf', 2)], {
      mode: 'sequence',
      opacity: 1,
      scale: 1,
    })
    expect((await load(out.file)).getPageCount()).toBe(4)
  })
})
