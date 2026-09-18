import type { PDFFont } from 'pdf-lib'
import type { OutputFile } from '../types'
import { pdfLib, savePdf } from './load'
import { embedFont, mmToPt, assertLatin, type FontFamily } from './stamp'

export interface TextToPdfParams {
  text: string
  pageSize: 'a4' | 'letter'
  family: FontFamily
  size: number
  marginMm: number
  name?: string
}

const SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
}

/** Greedy word wrap; long words are split so nothing runs off the page. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []

  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word
        continue
      }
      // break a word that cannot fit on any line
      let chunk = ''
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk)
          chunk = char
        } else {
          chunk += char
        }
      }
      line = chunk
    }
    lines.push(line)
  }

  return lines
}

export async function textToPdf(params: TextToPdfParams): Promise<OutputFile> {
  assertLatin(params.text)
  const { PDFDocument } = await pdfLib()
  const doc = await PDFDocument.create()
  const font = await embedFont(doc, params.family, false)

  const [pageWidth, pageHeight] = SIZES[params.pageSize]
  const margin = mmToPt(params.marginMm)
  const lineHeight = params.size * 1.45
  const usableWidth = pageWidth - margin * 2
  const lines = wrapText(params.text, font, params.size, usableWidth)

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin - params.size

  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin - params.size
    }
    if (line) page.drawText(line, { x: margin, y, size: params.size, font })
    y -= lineHeight
  }

  const name = `${params.name?.trim().replace(/\.pdf$/i, '') || 'text'}.pdf`
  const file = await savePdf(doc, name)
  return {
    file,
    sourceName: `${params.text.length} characters`,
    sourceSize: new Blob([params.text]).size,
    note: `${doc.getPageCount()} pp`,
  }
}
