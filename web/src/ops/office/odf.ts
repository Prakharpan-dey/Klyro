import { elements, plainText, unzipParts } from './ooxml'
import type { Paragraph } from './layout'
import type { CellValue, Sheet } from './xlsx'

/**
 * A reader for OpenDocument text and spreadsheets.
 *
 * ODF is the same idea as Office Open XML — a zip of XML — so the zip and
 * scanning helpers in `ooxml.ts` carry straight over and no parser library is
 * needed. The two halves of this file feed different renderers: a document
 * becomes paragraphs for `paragraphsToPdf`, a spreadsheet becomes sheets for
 * the table renderer the Excel tool already uses.
 */

/** A cell or row can say it repeats; a run at the end of a row often claims hundreds. */
const MAX_REPEAT = 256

function repeatCount(raw: string | undefined): number {
  const n = Number(raw ?? '1')
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(Math.floor(n), MAX_REPEAT)
}

export async function readOdfContent(file: File): Promise<string> {
  const parts = await unzipParts(file)
  return parts.get('content.xml') ?? ''
}

/* ── text documents ────────────────────────────────────────────── */

function headingStyle(level: string | undefined): Paragraph['style'] {
  if (level === '1') return 'h1'
  if (level === '2') return 'h2'
  return 'h3'
}

export function readOdtParagraphs(contentXml: string): Paragraph[] {
  const body = elements(contentXml, 'office:text')[0]?.inner ?? contentXml
  const out: Paragraph[] = []

  // headings and paragraphs are separate elements, so the body is walked in
  // document order rather than element by element, or the headings would all
  // end up bunched at the top
  const ORDER = /<(text:h|text:p|text:list-item)(\s[^>]*?)?(\/?)>/g
  let match: RegExpExecArray | null

  while ((match = ORDER.exec(body))) {
    const [whole, name, rawAttrs = '', selfClosing] = match
    if (selfClosing === '/') continue

    const from = match.index + whole.length
    const to = body.indexOf(`</${name}>`, from)
    if (to === -1) break
    // skip past the element: a list item holds paragraphs, and matching those
    // again would print every bullet twice
    ORDER.lastIndex = to

    const text = plainText(body.slice(from, to)).trim()
    if (!text) continue

    if (name === 'text:h') {
      const level = /text:outline-level="(\d+)"/.exec(rawAttrs)?.[1]
      out.push({ text, style: headingStyle(level) })
    } else if (name === 'text:list-item') {
      out.push({ text: `• ${text}`, style: 'body' })
    } else {
      out.push({ text, style: 'body' })
    }
  }

  return out
}

/* ── spreadsheets ──────────────────────────────────────────────── */

function cellValue(cell: { attrs: Record<string, string>; inner: string }): CellValue {
  const type = cell.attrs['office:value-type']
  if (type === 'float' || type === 'percentage' || type === 'currency') {
    const n = Number(cell.attrs['office:value'])
    if (Number.isFinite(n)) return n
  }
  const text = plainText(cell.inner).trim()
  return text || null
}

/** Drops the empty cells ODF pads every row out to. */
function trimRow(row: CellValue[]): CellValue[] {
  let end = row.length
  while (end > 0 && (row[end - 1] === null || row[end - 1] === '')) end--
  return row.slice(0, end)
}

export function readOdsSheets(contentXml: string): Sheet[] {
  const sheets: Sheet[] = []

  for (const table of elements(contentXml, 'table:table')) {
    const rows: CellValue[][] = []

    for (const row of elements(table.inner, 'table:table-row')) {
      const cells: CellValue[] = []
      for (const cell of elements(row.inner, 'table:table-cell')) {
        const value = cellValue(cell)
        const repeat = repeatCount(cell.attrs['table:number-columns-repeated'])
        for (let i = 0; i < repeat; i++) cells.push(value)
      }

      const trimmed = trimRow(cells)
      const repeat = repeatCount(row.attrs['table:number-rows-repeated'])
      // a repeated empty row is padding, not data
      if (!trimmed.length && repeat > 1) continue
      for (let i = 0; i < repeat; i++) rows.push(trimmed)
    }

    while (rows.length && !rows[rows.length - 1].length) rows.pop()
    sheets.push({ name: table.attrs['table:name'] ?? `Sheet ${sheets.length + 1}`, rows })
  }

  return sheets
}
