import type { OutputFile, Progress } from '../types'
import { baseName } from '../pdf/load'
import { extractText } from '../pdf/text'
import { escapeXml, XML_HEADER, zipParts } from './ooxml'

/**
 * Word documents from extracted PDF text. A PDF stores glyphs at coordinates,
 * not paragraphs, so this carries words and line breaks across and nothing
 * else: no columns, no images, no original fonts. The tool says so on screen.
 */

const CONTENT_TYPES = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`

const ROOT_RELS = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

function paragraph(text: string): string {
  if (!text) return '<w:p/>'
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function heading(text: string): string {
  return `<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

export interface PdfToDocxParams {
  /** start each PDF page on its own Word page */
  pageBreaks: boolean
  /** write a bold "Page n" line above each page's text */
  pageHeadings: boolean
  /** join lines that look like one wrapped sentence */
  mergeWrapped: boolean
}

/** Lines ending mid-sentence are glued back together so Word can re-wrap them. */
export function joinWrapped(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const previous = out.at(-1)
    const continues =
      previous !== undefined &&
      previous !== '' &&
      line !== '' &&
      !/[.!?:;]["')\]]?$/.test(previous) &&
      !/^[-*•\d]/.test(line) &&
      previous.length > 40
    if (continues) out[out.length - 1] = `${previous} ${line}`
    else out.push(line)
  }
  return out
}

export function buildDocument(pages: string[], params: PdfToDocxParams): string {
  const body: string[] = []

  pages.forEach((text, index) => {
    if (index > 0 && params.pageBreaks) body.push(PAGE_BREAK)
    if (params.pageHeadings) body.push(heading(`Page ${index + 1}`))

    let lines = text.split(/\r?\n/).map((line) => line.trim())
    if (params.mergeWrapped) lines = joinWrapped(lines)
    // collapse runs of blank lines so the document does not gain empty pages
    lines = lines.filter((line, i) => line !== '' || lines[i - 1] !== '')

    for (const line of lines) body.push(paragraph(line))
  })

  if (!body.length) body.push(paragraph(''))

  return `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join(
    '',
  )}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`
}

export async function pdfToDocx(
  file: File,
  params: PdfToDocxParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const pages = await extractText(file, onProgress)
  const empty = pages.every((page) => !page.trim())

  const bytes = await zipParts({
    '[Content_Types].xml': CONTENT_TYPES,
    '_rels/.rels': ROOT_RELS,
    'word/document.xml': buildDocument(pages, params),
  })

  return {
    file: new File([bytes as BlobPart], `${baseName(file.name)}.docx`, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${pages.length} pp`,
    warning: empty
      ? 'No text was found. This PDF is probably scanned images, which this tool cannot read.'
      : undefined,
  }
}
