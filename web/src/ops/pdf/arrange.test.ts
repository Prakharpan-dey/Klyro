import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { alternateMix, insertBlankPages, reversePdf } from './arrange'

// page widths act as labels: 100, 101, 102 ... so order is checkable after the fact
async function makePdf(name: string, pages: number, offset = 0): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([100 + offset + i, 200])
  return new File([(await doc.save()) as BlobPart], name, { type: 'application/pdf' })
}

async function widths(file: File) {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  return doc.getPages().map((p) => Math.round(p.getWidth()))
}

describe('reversePdf', () => {
  it('flips the page order', async () => {
    const out = await reversePdf(await makePdf('a.pdf', 4))
    expect(await widths(out.file)).toEqual([103, 102, 101, 100])
    expect(out.file.name).toBe('a-reversed.pdf')
  })
})

describe('insertBlankPages', () => {
  const base = () => makePdf('doc.pdf', 3)

  it('adds blanks after the chosen page, matching its size', async () => {
    const out = await insertBlankPages(await base(), {
      positions: '2',
      where: 'after',
      count: 2,
      size: 'match',
    })
    expect(await widths(out.file)).toEqual([100, 101, 101, 101, 102])
  })

  it('adds blanks before the chosen page at a fixed size', async () => {
    const out = await insertBlankPages(await base(), {
      positions: '1',
      where: 'before',
      count: 1,
      size: 'a4',
    })
    expect(await widths(out.file)).toEqual([595, 100, 101, 102])
  })

  it('handles several positions at once', async () => {
    const out = await insertBlankPages(await base(), {
      positions: '1, 3',
      where: 'after',
      count: 1,
      size: 'match',
    })
    expect(await widths(out.file)).toEqual([100, 100, 101, 102, 102])
  })

  it('rejects page numbers past the end', async () => {
    await expect(
      insertBlankPages(await base(), { positions: '9', where: 'after', count: 1, size: 'match' }),
    ).rejects.toThrow(/past the end/)
  })
})

describe('alternateMix', () => {
  it('interleaves two documents one page at a time', async () => {
    const a = await makePdf('fronts.pdf', 3)
    const b = await makePdf('backs.pdf', 3, 50)
    const out = await alternateMix([a, b], { reverseSecond: false, step: 1 })
    expect(await widths(out.file)).toEqual([100, 150, 101, 151, 102, 152])
  })

  it('pairs fronts with backs when the second is reversed', async () => {
    const a = await makePdf('fronts.pdf', 3)
    const b = await makePdf('backs.pdf', 3, 50)
    const out = await alternateMix([a, b], { reverseSecond: true, step: 1 })
    expect(await widths(out.file)).toEqual([100, 152, 101, 151, 102, 150])
  })

  it('takes several pages per turn and appends leftovers', async () => {
    const a = await makePdf('a.pdf', 5)
    const b = await makePdf('b.pdf', 2, 50)
    const out = await alternateMix([a, b], { reverseSecond: false, step: 2 })
    expect(await widths(out.file)).toEqual([100, 101, 150, 151, 102, 103, 104])
  })

  it('needs exactly two files', async () => {
    const a = await makePdf('a.pdf', 1)
    await expect(alternateMix([a], { reverseSecond: false, step: 1 })).rejects.toThrow(/two PDFs/)
  })
})
