import { PDFDocument, degrees } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { mergePdfs } from './merge'
import { deletePages, rebuildPdf, rotatePages } from './pages'
import { splitPdf } from './split'

// pages get distinct widths so we can tell them apart after reordering
async function makePdf(name: string, pages: number, widthOffset = 0): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([100 + widthOffset + i, 200])
  return new File([(await doc.save()) as BlobPart], name, { type: 'application/pdf' })
}

async function widths(file: File) {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  return doc.getPages().map((p) => p.getWidth())
}

describe('mergePdfs', () => {
  it('joins documents in order', async () => {
    const a = await makePdf('a.pdf', 2)
    const b = await makePdf('b.pdf', 3, 50)
    const out = await mergePdfs([a, b])
    expect(await widths(out.file)).toEqual([100, 101, 150, 151, 152])
    expect(out.file.name).toBe('merged.pdf')
  })

  it('reports unreadable files by name', async () => {
    const bad = new File(['not a pdf'], 'broken.pdf', { type: 'application/pdf' })
    await expect(mergePdfs([bad])).rejects.toThrow(/broken\.pdf/)
  })
})

describe('splitPdf', () => {
  it('splits by ranges into one file per range', async () => {
    const src = await makePdf('doc.pdf', 6)
    const out = await splitPdf(src, { mode: 'ranges', ranges: '1-2, 5' })
    expect(out).toHaveLength(2)
    expect(await widths(out[0].file)).toEqual([100, 101])
    expect(await widths(out[1].file)).toEqual([104])
    expect(out[0].file.name).toBe('doc-p1-2.pdf')
  })

  it('splits every n pages', async () => {
    const src = await makePdf('doc.pdf', 5)
    const out = await splitPdf(src, { mode: 'every', size: 2 })
    expect(out.map((o) => o.note)).toEqual(['2 pp', '2 pp', '1 pp'])
  })

  it('extracts selected pages into a single file', async () => {
    const src = await makePdf('doc.pdf', 5)
    const out = await splitPdf(src, { mode: 'extract', pages: '5, 1' })
    expect(out).toHaveLength(1)
    expect(await widths(out[0].file)).toEqual([100, 104])
  })

  it('surfaces range errors', async () => {
    const src = await makePdf('doc.pdf', 3)
    await expect(splitPdf(src, { mode: 'ranges', ranges: '2-9' })).rejects.toThrow(/past the end/)
  })
})

describe('page edits', () => {
  it('reorders and rotates', async () => {
    const src = await makePdf('doc.pdf', 3)
    const out = await rebuildPdf(
      src,
      [
        { index: 2, rotate: 90 },
        { index: 0, rotate: 0 },
      ],
      '-organized',
    )
    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([102, 100])
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect(out.file.name).toBe('doc-organized.pdf')
  })

  it('adds to an existing rotation and wraps around', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([100, 200]).setRotation(degrees(270))
    const src = new File([(await doc.save()) as BlobPart], 'r.pdf')
    const out = await rotatePages(src, 'all', 180)
    const res = await PDFDocument.load(await out.file.arrayBuffer())
    expect(res.getPage(0).getRotation().angle).toBe(90)
  })

  it('deletes pages', async () => {
    const src = await makePdf('doc.pdf', 4)
    const out = await deletePages(src, [1, 3])
    expect(await widths(out.file)).toEqual([100, 102])
  })

  it('refuses to write an empty document', async () => {
    const src = await makePdf('doc.pdf', 2)
    await expect(rebuildPdf(src, [], '-x')).rejects.toThrow(/No pages/)
  })
})
