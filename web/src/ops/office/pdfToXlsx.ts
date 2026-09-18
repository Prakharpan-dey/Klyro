import type { OutputFile, Progress } from '../types'
import { baseName } from '../pdf/load'
import { closePdf, openPdf } from '../pdf/pdfjs'
import { extractPageItems, type TextPiece } from '../pdf/text'
import { writeWorkbook, type CellValue, type Sheet } from './xlsx'

/**
 * Tables out of a PDF. Nothing in the file says "this is a table", so the
 * columns are worked out from where the text sits: runs on the same baseline
 * become a row, and runs that start at the same horizontal position down the
 * page become a column. It is a good guess, not a certainty, and the tool says
 * as much before you run it.
 */

export type ColumnFit = 'tight' | 'normal' | 'loose'

/** how far apart two x positions must be to count as separate columns, in points */
const GAP: Record<ColumnFit, number> = { tight: 6, normal: 12, loose: 24 }

export interface PdfToXlsxParams {
  fit: ColumnFit
  /** one sheet per page, or every page stacked into one sheet */
  sheetPerPage: boolean
  /** turn things that look like numbers into numbers Excel can add up */
  parseNumbers: boolean
}

/** Groups runs that share a baseline, top of the page first. */
export function groupRows(items: TextPiece[], tolerance = 4): TextPiece[][] {
  const rows: TextPiece[][] = []
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.at(-1)
    if (row && Math.abs((row[0]?.y ?? 0) - item.y) <= tolerance) row.push(item)
    else rows.push([item])
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x))
}

/** Clusters the left edges of every run into column start positions. */
export function columnStarts(items: TextPiece[], gap: number): number[] {
  const starts: number[] = []
  for (const x of items.map((item) => item.x).sort((a, b) => a - b)) {
    const last = starts.at(-1)
    if (last === undefined || x - last > gap) starts.push(x)
  }
  return starts
}

const NUMBER = /^-?[\d,]*\.?\d+$/

export function toCell(text: string, parseNumbers: boolean): CellValue {
  const value = text.trim()
  if (!parseNumbers || !value) return value
  const bare = value.replace(/^[(₹$€£]+|[)%]+$/g, '').trim()
  if (!NUMBER.test(bare)) return value
  const number = Number(bare.replace(/,/g, ''))
  if (!Number.isFinite(number)) return value
  const negative = value.startsWith('(') && value.endsWith(')')
  return value.endsWith('%') ? value : negative ? -number : number
}

export function tableFromItems(items: TextPiece[], params: PdfToXlsxParams): CellValue[][] {
  if (!items.length) return []
  const starts = columnStarts(items, GAP[params.fit])

  return groupRows(items).map((row) => {
    const cells: string[] = new Array(starts.length).fill('')
    for (const item of row) {
      // the last column start at or before this run is the column it belongs to
      let column = 0
      for (let i = 0; i < starts.length; i++) if (item.x + 1 >= starts[i]) column = i
      cells[column] = cells[column] ? `${cells[column]} ${item.str.trim()}` : item.str.trim()
    }
    while (cells.length && cells.at(-1) === '') cells.pop()
    return cells.map((cell) => toCell(cell, params.parseNumbers))
  })
}

export async function pdfToXlsx(
  file: File,
  params: PdfToXlsxParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const doc = await openPdf(file)
  const sheets: Sheet[] = []
  let rowCount = 0

  try {
    const combined: CellValue[][] = []
    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(i, doc.numPages, `Reading page ${i + 1}`)
      const table = tableFromItems(await extractPageItems(doc, i), params)
      rowCount += table.length
      if (params.sheetPerPage) sheets.push({ name: `Page ${i + 1}`, rows: table })
      else combined.push(...table, [])
    }
    if (!params.sheetPerPage)
      sheets.push({ name: baseName(file.name).slice(0, 31), rows: combined })
  } finally {
    await closePdf(doc)
  }

  const bytes = await writeWorkbook(sheets)
  return {
    file: new File([bytes as BlobPart], `${baseName(file.name)}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${rowCount} rows`,
    warning: rowCount
      ? undefined
      : 'No text was found. A scanned PDF holds pictures of a table, not the table itself.',
  }
}
