import type { PDFDocument } from 'pdf-lib'
import { formatPageList } from '@/lib/pageRange'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'

export interface PageEdit {
  /** 0-based index in the source document */
  index: number
  /** extra clockwise rotation in degrees, multiple of 90 */
  rotate: number
}

async function copyInto(src: PDFDocument, edits: PageEdit[]): Promise<PDFDocument> {
  const { PDFDocument, degrees } = await pdfLib()
  const out = await PDFDocument.create()
  const copied = await out.copyPages(
    src,
    edits.map((e) => e.index),
  )
  copied.forEach((page, i) => {
    const extra = edits[i].rotate
    if (extra) {
      const current = page.getRotation().angle
      page.setRotation(degrees((((current + extra) % 360) + 360) % 360))
    }
    out.addPage(page)
  })
  return out
}

/** Writes a new PDF containing the given pages in the given order, with optional rotation. */
export async function rebuildPdf(
  file: File,
  edits: PageEdit[],
  suffix: string,
): Promise<OutputFile> {
  if (!edits.length) throw new Error('No pages left to save')
  const src = await loadPdf(file)
  const out = await copyInto(src, edits)
  return {
    file: await savePdf(out, `${baseName(file.name)}${suffix}.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} pp`,
  }
}

/** One output file per group of 0-based page indices. */
export async function extractGroups(file: File, groups: number[][]): Promise<OutputFile[]> {
  const src = await loadPdf(file)
  const base = baseName(file.name)
  const results: OutputFile[] = []
  for (const group of groups) {
    const out = await copyInto(
      src,
      group.map((index) => ({ index, rotate: 0 })),
    )
    const label = formatPageList([...group].sort((a, b) => a - b)).replace(/, /g, '_')
    results.push({
      file: await savePdf(out, `${base}-p${label}.pdf`),
      sourceName: file.name,
      sourceSize: file.size,
      note: `${group.length} pp`,
    })
  }
  return results
}

export async function deletePages(file: File, remove: number[]): Promise<OutputFile> {
  const src = await loadPdf(file)
  const drop = new Set(remove)
  const edits = src
    .getPageIndices()
    .filter((i) => !drop.has(i))
    .map((index) => ({ index, rotate: 0 }))
  return rebuildPdf(file, edits, '-edited')
}

export async function rotatePages(
  file: File,
  pages: number[] | 'all',
  rotate: number,
): Promise<OutputFile> {
  const src = await loadPdf(file)
  const target = pages === 'all' ? null : new Set(pages)
  const edits = src
    .getPageIndices()
    .map((index) => ({ index, rotate: !target || target.has(index) ? rotate : 0 }))
  return rebuildPdf(file, edits, '-rotated')
}
