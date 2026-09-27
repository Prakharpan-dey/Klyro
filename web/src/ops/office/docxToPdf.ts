import type { OutputFile, Progress } from '../types'
import { elements, textRuns, unzipParts, type XmlElement } from './ooxml'
import { paragraphsToPdf, type LayoutParams, type Paragraph } from './layout'

/**
 * Reads the text of a .docx and hands it to the shared layout renderer.
 *
 * A Word file is a zip of XML parts; `word/document.xml` holds the body as a
 * run of `<w:p>` paragraphs, each carrying its style name and its text in `<w:t>`
 * elements. That is everything this needs. Images, tables, columns, footnotes
 * and the drawing layer are not reproduced, which the tool copy states plainly
 * rather than letting a user discover it on a CV.
 */

/** Word's built-in heading style names, plus what LibreOffice writes. */
function styleOf(paragraph: XmlElement): Paragraph['style'] {
  const style = elements(paragraph.inner, 'w:pStyle')[0]?.attrs['w:val'] ?? ''
  const name = style.toLowerCase().replace(/\s+/g, '')

  if (/^(heading1|title|h1)$/.test(name)) return 'h1'
  if (/^(heading2|subtitle|h2)$/.test(name)) return 'h2'
  if (/^heading[3-9]$/.test(name) || name === 'h3') return 'h3'
  if (name.includes('quote')) return 'quote'
  if (name.includes('code') || name === 'htmlpreformatted') return 'code'
  return 'body'
}

function isBold(paragraph: XmlElement): boolean {
  // bold for the paragraph as a whole, not per run: the renderer draws one
  // font per paragraph, so a half-bold line resolves to whichever the first
  // run asked for
  const first = elements(paragraph.inner, 'w:rPr')[0]
  if (!first) return false
  const bold = elements(first.inner, 'w:b')[0]
  return bold !== undefined && bold.attrs['w:val'] !== '0' && bold.attrs['w:val'] !== 'false'
}

function isItalic(paragraph: XmlElement): boolean {
  const first = elements(paragraph.inner, 'w:rPr')[0]
  if (!first) return false
  const italic = elements(first.inner, 'w:i')[0]
  return italic !== undefined && italic.attrs['w:val'] !== '0' && italic.attrs['w:val'] !== 'false'
}

/** Numbered and bulleted paragraphs, marked so the bullet is not lost. */
function isListItem(paragraph: XmlElement): boolean {
  return elements(paragraph.inner, 'w:numPr').length > 0
}

export function readDocxParagraphs(documentXml: string): Paragraph[] {
  const body = elements(documentXml, 'w:body')[0]?.inner ?? documentXml
  const out: Paragraph[] = []

  for (const paragraph of elements(body, 'w:p')) {
    // a page break renders as an empty paragraph carrying <w:br w:type="page">
    const pageBreak = elements(paragraph.inner, 'w:br').some(
      (br) => br.attrs['w:type'] === 'page',
    )
    const text = textRuns(paragraph.inner, 'w:t').trim()

    if (pageBreak) out.push({ text: '', style: 'break' })
    if (!text) continue

    out.push({
      text: isListItem(paragraph) ? `• ${text}` : text,
      style: styleOf(paragraph),
      bold: isBold(paragraph),
      italic: isItalic(paragraph),
    })
  }

  return out
}

export class EmptyDocumentError extends Error {
  constructor(what: string) {
    super(`No readable text in this ${what}. It may be empty, or hold only images.`)
  }
}

export async function docxToPdf(
  file: File,
  params: LayoutParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Reading the document')
  const parts = await unzipParts(file)
  const documentXml = parts.get('word/document.xml')
  if (!documentXml) throw new EmptyDocumentError('Word file')

  const paragraphs = readDocxParagraphs(documentXml)
  if (!paragraphs.length) throw new EmptyDocumentError('Word file')

  return paragraphsToPdf(paragraphs, file, params, onProgress)
}
