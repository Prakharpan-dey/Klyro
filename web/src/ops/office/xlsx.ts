import {
  elements,
  escapeXml,
  textRuns,
  unescapeXml,
  unzipParts,
  XML_HEADER,
  zipParts,
} from './ooxml'

/**
 * A small reader and writer for the spreadsheet half of Office Open XML.
 * The writer emits inline strings so no shared-string table is needed; the
 * reader understands what Excel, LibreOffice and Sheets actually produce.
 */

export type CellValue = string | number | null

export interface Sheet {
  name: string
  rows: CellValue[][]
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** "BC7" -> 54 (zero based column index) */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref.toUpperCase())?.[0] ?? 'A'
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

/** 0 -> "A", 26 -> "AA" */
export function columnName(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - remainder) / 26)
  }
  return name
}

function cellText(inner: string, type: string | undefined, shared: string[]): CellValue {
  if (type === 'inlineStr') return textRuns(inner)
  const raw = elements(inner, 'v')[0]
  if (!raw) return type === 'str' ? textRuns(inner) : null
  const value = unescapeXml(raw.inner)
  if (type === 's') return shared[Number(value)] ?? ''
  if (type === 'str' || type === 'e') return value
  if (type === 'b') return value === '1' ? 'TRUE' : 'FALSE'
  const number = Number(value)
  return Number.isFinite(number) && value.trim() !== '' ? number : value
}

function sheetRows(xml: string, shared: string[]): CellValue[][] {
  const rows: CellValue[][] = []

  for (const row of elements(xml, 'row')) {
    const cells: CellValue[] = []
    let next = 0
    for (const cell of elements(row.inner, 'c')) {
      const at = cell.attrs.r ? columnIndex(cell.attrs.r) : next
      while (cells.length < at) cells.push(null)
      cells[at] = cellText(cell.inner, cell.attrs.t, shared)
      next = at + 1
    }
    const at = row.attrs.r ? Number(row.attrs.r) - 1 : rows.length
    while (rows.length < at) rows.push([])
    rows[at] = cells
  }

  // drop trailing empties that only exist because Excel wrote a style there
  while (rows.length && rows.at(-1)?.every((cell) => cell === null || cell === '')) rows.pop()
  return rows
}

export async function readWorkbook(file: File): Promise<Sheet[]> {
  const parts = await unzipParts(file)
  const workbook = parts.get('xl/workbook.xml')
  if (!workbook) throw new Error('This does not look like an .xlsx workbook')

  const rels = new Map<string, string>()
  for (const rel of elements(parts.get('xl/_rels/workbook.xml.rels') ?? '', 'Relationship')) {
    const target = rel.attrs.Target ?? ''
    rels.set(rel.attrs.Id ?? '', target.startsWith('/') ? target.slice(1) : `xl/${target}`)
  }

  const shared = elements(parts.get('xl/sharedStrings.xml') ?? '', 'si').map((si) =>
    textRuns(si.inner),
  )

  const sheets: Sheet[] = []
  elements(workbook, 'sheet').forEach((sheet, index) => {
    const id = sheet.attrs['r:id'] ?? sheet.attrs.id ?? ''
    const path = rels.get(id) ?? `xl/worksheets/sheet${index + 1}.xml`
    const xml = parts.get(path.replace(/^xl\/\.\.\//, ''))
    if (!xml) return
    sheets.push({ name: sheet.attrs.name || `Sheet ${index + 1}`, rows: sheetRows(xml, shared) })
  })

  if (!sheets.length) throw new Error('This workbook has no readable sheets')
  return sheets
}

function cellXml(value: CellValue, ref: string): string {
  if (value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
}

function sheetXml(rows: CellValue[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row.map((cell, c) => cellXml(cell, `${columnName(c)}${r + 1}`)).join('')
      return cells ? `<row r="${r + 1}">${cells}</row>` : `<row r="${r + 1}"/>`
    })
    .join('')
  return `${XML_HEADER}<worksheet xmlns="${MAIN}"><sheetData>${body}</sheetData></worksheet>`
}

export async function writeWorkbook(sheets: Sheet[]): Promise<Uint8Array> {
  const used = new Set<string>()
  const names = sheets.map((sheet, index) => {
    // Excel rejects these characters and any name over 31 characters
    let name = (sheet.name || `Sheet ${index + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
    while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)} ${index + 1}`
    used.add(name.toLowerCase())
    return name
  })

  const parts: Record<string, string> = {
    '[Content_Types].xml': `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('')}</Types>`,
    '_rels/.rels': `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML_HEADER}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>${names
      .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('')}</Relationships>`,
  }

  sheets.forEach((sheet, i) => {
    parts[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sheet.rows)
  })

  return zipParts(parts)
}
