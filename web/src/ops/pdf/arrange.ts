import { parsePageList } from '@/lib/pageRange'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { rebuildPdf } from './pages'

export async function reversePdf(file: File): Promise<OutputFile> {
  const src = await loadPdf(file)
  const edits = src
    .getPageIndices()
    .reverse()
    .map((index) => ({ index, rotate: 0 }))
  return rebuildPdf(file, edits, '-reversed')
}

export interface InsertBlankParams {
  /** 1-based page numbers the blanks attach to, e.g. "1, 3-4" */
  positions: string
  where: 'before' | 'after'
  /** how many blank pages at each position */
  count: number
  /** 'match' copies the size of the neighbouring page */
  size: 'match' | 'a4' | 'letter'
}

const SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
}

export async function insertBlankPages(file: File, params: InsertBlankParams): Promise<OutputFile> {
  const src = await loadPdf(file)
  const pageCount = src.getPageCount()
  const { pages, error } = parsePageList(params.positions, pageCount)
  if (error) throw new Error(error)
  if (!pages.length) throw new Error('Choose at least one page')

  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, src.getPageIndices())
  const at = new Set(pages)
  const blanks = Math.max(1, Math.min(20, Math.round(params.count)))

  const addBlank = (neighbour: (typeof copied)[number]) => {
    const size =
      params.size === 'match'
        ? ([neighbour.getWidth(), neighbour.getHeight()] as [number, number])
        : SIZES[params.size]
    for (let i = 0; i < blanks; i++) out.addPage(size)
  }

  copied.forEach((page, index) => {
    if (params.where === 'before' && at.has(index)) addBlank(page)
    out.addPage(page)
    if (params.where === 'after' && at.has(index)) addBlank(page)
  })

  return {
    file: await savePdf(out, `${baseName(file.name)}-with-blanks.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} pp`,
  }
}

export interface AlternateMixParams {
  /** read the second document from its last page backwards (scanned backs) */
  reverseSecond: boolean
  /** how many pages to take from each document per turn */
  step: number
}

/**
 * Interleaves two documents: useful when a scanner produced fronts in one file
 * and backs in another. Leftover pages are appended in order.
 */
export async function alternateMix(files: File[], params: AlternateMixParams): Promise<OutputFile> {
  if (files.length !== 2) throw new Error('Add exactly two PDFs')
  const [first, second] = await Promise.all(files.map((f) => loadPdf(f)))
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()

  const a = first.getPageIndices()
  const b = second.getPageIndices()
  if (params.reverseSecond) b.reverse()

  const copiedA = await out.copyPages(first, a)
  const copiedB = await out.copyPages(second, b)
  const step = Math.max(1, Math.min(10, Math.round(params.step)))

  let i = 0
  let j = 0
  while (i < copiedA.length || j < copiedB.length) {
    for (let k = 0; k < step && i < copiedA.length; k++, i++) out.addPage(copiedA[i])
    for (let k = 0; k < step && j < copiedB.length; k++, j++) out.addPage(copiedB[j])
  }

  return {
    file: await savePdf(out, `${baseName(files[0].name)}-mixed.pdf`),
    sourceName: files.map((f) => f.name).join(' + '),
    sourceSize: files.reduce((n, f) => n + f.size, 0),
    note: `${out.getPageCount()} pp`,
  }
}
