import type { PDFFont } from 'pdf-lib'
import type { OutputFile, Progress } from '../types'
import { baseName, pdfLib, savePdf } from '../pdf/load'
import { embedFont, mmToPt, stripNonLatin, type FontFamily } from '../pdf/stamp'
import { parseCsv, type Delimiter } from './csv'
import { readWorkbook, type CellValue, type Sheet } from './xlsx'

/** A spreadsheet drawn as a plain table: no formulas, no colours, no charts. */

const SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
}

export interface ExcelToPdfParams {
  pageSize: 'a4' | 'letter'
  landscape: boolean
  family: FontFamily
  size: number
  marginMm: number
  /** treat the first row as a header: bold, ruled, repeated on every page */
  headerRow: boolean
  /** draw the grid lines */
  gridLines: boolean
}

export function cellToText(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
  }
  return value
}

/** Column widths from the widest cell in each column, then squeezed to fit the page. */
export function columnWidths(
  rows: string[][],
  font: PDFFont,
  size: number,
  available: number,
  padding: number,
): number[] {
  const count = rows.reduce((most, row) => Math.max(most, row.length), 0)
  if (!count) return []

  const natural = new Array<number>(count).fill(0)
  for (const row of rows) {
    row.forEach((cell, i) => {
      const width = font.widthOfTextAtSize(cell.slice(0, 120), size) + padding * 2
      if (width > natural[i]) natural[i] = width
    })
  }

  const total = natural.reduce((sum, width) => sum + width, 0)
  if (total <= available) return natural

  // shrink the greedy columns first so short ones stay readable
  const floor = Math.min(available / count, mmToPt(18))
  const fixed = natural.map((width) => Math.min(width, floor))
  const spare = available - fixed.reduce((sum, width) => sum + width, 0)
  const hungry = natural.map((width, i) => Math.max(0, width - fixed[i]))
  const hunger = hungry.reduce((sum, width) => sum + width, 0)
  if (spare <= 0 || hunger === 0) return fixed.map(() => available / count)
  return fixed.map((width, i) => width + (hungry[i] / hunger) * spare)
}

/** Cuts text to what fits, ending in an ellipsis when something was dropped. */
export function clip(text: string, font: PDFFont, size: number, max: number): string {
  if (!text || font.widthOfTextAtSize(text, size) <= max) return text
  let cut = text
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > max) {
    cut = cut.slice(0, -1)
  }
  return `${cut}…`
}


export class LegacyExcelError extends Error {
  constructor() {
    super('This is an old .xls file. Save it as .xlsx or .csv and try again.')
  }
}

/**
 * Reads a spreadsheet by what it is, not by what it claims to be.
 *
 * The mime type cannot be trusted here: Windows labels a .csv as
 * `application/vnd.ms-excel` whenever Excel is installed, which is the same
 * label a real binary .xls carries. The first bytes settle it — a zip is an
 * .xlsx, an OLE header is the old binary format nothing here can read, and
 * anything else is text.
 */
export async function readSheets(file: File, delimiter?: Delimiter): Promise<Sheet[]> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04
  const isOle = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0

  if (isZip) return readWorkbook(file)
  if (isOle) throw new LegacyExcelError()
  return [parseCsv(await file.text(), file.name, delimiter)]
}

export async function excelToPdf(
  file: File,
  params: ExcelToPdfParams,
  onProgress?: Progress,
  delimiter?: Delimiter,
): Promise<OutputFile> {
  return sheetsToPdf(await readSheets(file, delimiter), file, params, onProgress)
}

/**
 * The drawing half, taking sheets rather than a file so an OpenDocument
 * spreadsheet reaches the same table renderer without a second copy of it.
 */
export async function sheetsToPdf(
  sheets: Sheet[],
  source: { name: string; size: number },
  params: ExcelToPdfParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const { PDFDocument, rgb } = await pdfLib()
  const doc = await PDFDocument.create()
  const font = await embedFont(doc, params.family, false)
  const bold = await embedFont(doc, params.family, true)

  const [shortSide, longSide] = SIZES[params.pageSize]
  const pageSize: [number, number] = params.landscape
    ? [longSide, shortSide]
    : [shortSide, longSide]
  const margin = mmToPt(params.marginMm)
  const available = pageSize[0] - margin * 2
  const padding = params.size * 0.4
  const lineHeight = params.size * 1.6
  const ink = rgb(0.1, 0.1, 0.1)
  const rule = rgb(0.75, 0.75, 0.75)

  let dropped = 0
  const clean = (value: CellValue) =>
    stripNonLatin(cellToText(value), (count) => {
      dropped += count
    })

  let pageCount = 0

  const drawSheet = (sheet: Sheet) => {
    const rows = sheet.rows.map((row) => row.map(clean))
    if (!rows.length) rows.push([''])
    // measured in the bold face when there is a header: it is the wider of the
    // two, and measuring in the regular one clips every heading by a character
    const widths = columnWidths(
      rows,
      params.headerRow ? bold : font,
      params.size,
      available,
      padding,
    )
    const header = params.headerRow ? rows[0] : null
    const body = params.headerRow ? rows.slice(1) : rows

    let page = doc.addPage(pageSize)
    pageCount++
    let y = pageSize[1] - margin

    const drawRow = (cells: string[], useBold: boolean) => {
      let x = margin
      cells.forEach((cell, i) => {
        const width = widths[i] ?? 0
        if (cell) {
          page.drawText(clip(cell, useBold ? bold : font, params.size, width - padding * 2), {
            x: x + padding,
            y: y - params.size,
            size: params.size,
            font: useBold ? bold : font,
            color: ink,
          })
        }
        if (params.gridLines && width) {
          page.drawLine({
            start: { x, y: y + lineHeight - params.size * 1.2 },
            end: { x, y: y - lineHeight + params.size * 1.2 },
            thickness: 0.4,
            color: rule,
          })
        }
        x += width
      })
      if (params.gridLines) {
        // close the row off on the right, then rule underneath it
        page.drawLine({
          start: { x, y: y + lineHeight - params.size * 1.2 },
          end: { x, y: y - lineHeight + params.size * 1.2 },
          thickness: 0.4,
          color: rule,
        })
        page.drawLine({
          start: { x: margin, y: y - lineHeight + params.size * 0.4 },
          end: { x, y: y - lineHeight + params.size * 0.4 },
          thickness: 0.4,
          color: rule,
        })
      }
      y -= lineHeight
    }

    const title = stripNonLatin(sheet.name)
    if (title) {
      page.drawText(clip(title, bold, params.size + 2, available), {
        x: margin,
        y: y - params.size - 2,
        size: params.size + 2,
        font: bold,
        color: ink,
      })
      y -= lineHeight * 1.6
    }
    if (header) drawRow(header, true)

    for (const row of body) {
      if (y - lineHeight < margin) {
        page = doc.addPage(pageSize)
        pageCount++
        y = pageSize[1] - margin
        if (header) drawRow(header, true)
      }
      drawRow(row, false)
    }
  }

  sheets.forEach((sheet, index) => {
    onProgress?.(index, sheets.length, `Drawing ${sheet.name}`)
    drawSheet(sheet)
  })

  return {
    file: await savePdf(doc, `${baseName(source.name)}.pdf`),
    sourceName: source.name,
    sourceSize: source.size,
    note: `${sheets.length} sheet${sheets.length === 1 ? '' : 's'} · ${pageCount} pp`,
    warning: dropped
      ? 'Some characters were dropped: the built-in PDF fonts only cover Latin text.'
      : undefined,
  }
}
