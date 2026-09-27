import type { PDFFont } from 'pdf-lib'
import type { OutputFile, Progress } from '../types'
import { baseName, pdfLib, savePdf } from '../pdf/load'
import { sheetSize } from '../pdf/geometry'
import { mmToPt, stripNonLatin, type FontFamily } from '../pdf/stamp'

/**
 * One renderer for every document format that reduces to a run of paragraphs.
 *
 * Word, OpenDocument, RTF, EPUB and HTML all arrive here as `Paragraph[]`: each
 * reader knows one container format and nothing about PDF, and this knows how
 * to flow text onto pages and nothing about where it came from. Writing the
 * page-break, wrapping and font handling once is the whole point — five copies
 * of it would drift within a month.
 *
 * This is text-level fidelity, not layout. Columns, floats, tables and absolute
 * positioning in the source are not reproduced, and every tool built on it says
 * so in its own copy rather than implying otherwise.
 */

export type ParagraphStyle = 'h1' | 'h2' | 'h3' | 'body' | 'quote' | 'code' | 'break'

export interface Paragraph {
  text: string
  style: ParagraphStyle
  bold?: boolean
  italic?: boolean
}

export interface LayoutParams {
  pageSize: 'a4' | 'letter'
  family: FontFamily
  /** body size in points; headings scale off this */
  size: number
  marginMm: number
  /** line height as a multiple of the type size */
  leading: number
}

export const LAYOUT_DEFAULTS: LayoutParams = {
  pageSize: 'a4',
  family: 'times',
  size: 11,
  marginMm: 20,
  leading: 1.45,
}

interface StyleRule {
  /** multiplier on the body size */
  scale: number
  bold: boolean
  italic: boolean
  mono: boolean
  /** blank space above, as a multiple of the resulting line height */
  before: number
  after: number
  /** left indent in points */
  indent: number
}

const STYLES: Record<ParagraphStyle, StyleRule> = {
  h1: { scale: 1.75, bold: true, italic: false, mono: false, before: 0.9, after: 0.35, indent: 0 },
  h2: { scale: 1.4, bold: true, italic: false, mono: false, before: 0.8, after: 0.3, indent: 0 },
  h3: { scale: 1.15, bold: true, italic: false, mono: false, before: 0.7, after: 0.25, indent: 0 },
  body: { scale: 1, bold: false, italic: false, mono: false, before: 0, after: 0.45, indent: 0 },
  quote: { scale: 1, bold: false, italic: true, mono: false, before: 0.2, after: 0.5, indent: 18 },
  code: { scale: 0.92, bold: false, italic: false, mono: true, before: 0.2, after: 0.5, indent: 18 },
  break: { scale: 1, bold: false, italic: false, mono: false, before: 0, after: 0, indent: 0 },
}

/**
 * Greedy word wrap. A word longer than the line — a URL, usually — is split at
 * whatever character still fits rather than being allowed to run off the page.
 */
export function wrapText(text: string, font: PDFFont, size: number, max: number): string[] {
  if (!text) return []
  const lines: string[] = []
  let line = ''

  const flush = () => {
    if (line) lines.push(line)
    line = ''
  }

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= max) {
      line = candidate
      continue
    }
    flush()
    if (font.widthOfTextAtSize(word, size) <= max) {
      line = word
      continue
    }
    // a single unbreakable run: cut it at the last character that fits
    let rest = word
    while (font.widthOfTextAtSize(rest, size) > max) {
      let cut = rest.length - 1
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > max) cut--
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    line = rest
  }

  flush()
  return lines
}

export interface LayoutResult extends OutputFile {
  pageCount: number
}

export async function paragraphsToPdf(
  paragraphs: Paragraph[],
  source: { name: string; size: number },
  params: LayoutParams,
  onProgress?: Progress,
): Promise<LayoutResult> {
  const { PDFDocument, StandardFonts, rgb } = await pdfLib()
  const doc = await PDFDocument.create()

  const faces = {
    helvetica: [
      StandardFonts.Helvetica,
      StandardFonts.HelveticaBold,
      StandardFonts.HelveticaOblique,
      StandardFonts.HelveticaBoldOblique,
    ],
    times: [
      StandardFonts.TimesRoman,
      StandardFonts.TimesRomanBold,
      StandardFonts.TimesRomanItalic,
      StandardFonts.TimesRomanBoldItalic,
    ],
    courier: [
      StandardFonts.Courier,
      StandardFonts.CourierBold,
      StandardFonts.CourierOblique,
      StandardFonts.CourierBoldOblique,
    ],
  } as const

  const [regular, bold, italic, boldItalic] = await Promise.all(
    faces[params.family].map((name) => doc.embedFont(name)),
  )
  const [mono, monoBold] = await Promise.all([
    doc.embedFont(StandardFonts.Courier),
    doc.embedFont(StandardFonts.CourierBold),
  ])

  const pick = (rule: StyleRule, para: Paragraph) => {
    const wantBold = rule.bold || para.bold === true
    if (rule.mono) return wantBold ? monoBold : mono
    const wantItalic = rule.italic || para.italic === true
    if (wantBold && wantItalic) return boldItalic
    if (wantBold) return bold
    if (wantItalic) return italic
    return regular
  }

  const [pageWidth, pageHeight] = sheetSize(params.pageSize, 'portrait')
  const margin = mmToPt(params.marginMm)
  const available = pageWidth - margin * 2
  const ink = rgb(0.1, 0.1, 0.1)

  let page = doc.addPage([pageWidth, pageHeight])
  let pageCount = 1
  let y = pageHeight - margin
  let dropped = 0

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight])
    pageCount++
    y = pageHeight - margin
  }

  const total = paragraphs.length
  paragraphs.forEach((para, index) => {
    if (index % 25 === 0) onProgress?.(index, total, 'Laying out pages')

    const rule = STYLES[para.style] ?? STYLES.body
    const size = params.size * rule.scale
    const lineHeight = size * params.leading

    if (para.style === 'break') {
      newPage()
      return
    }

    const text = stripNonLatin(para.text, (count) => {
      dropped += count
    })
    if (!text.trim()) {
      y -= lineHeight * 0.5
      return
    }

    const font = pick(rule, para)
    const width = available - rule.indent
    const lines = wrapText(text, font, size, width)

    // keep a heading with at least one line of what follows it
    const keepWith = rule.bold ? lineHeight : 0
    if (y - lineHeight * rule.before - lineHeight - keepWith < margin) newPage()
    else y -= lineHeight * rule.before

    for (const line of lines) {
      if (y - lineHeight < margin) newPage()
      page.drawText(line, {
        x: margin + rule.indent,
        y: y - size,
        size,
        font,
        color: ink,
      })
      y -= lineHeight
    }

    y -= lineHeight * rule.after
  })

  onProgress?.(total, total, 'Writing the PDF')

  return {
    file: await savePdf(doc, `${baseName(source.name)}.pdf`),
    sourceName: source.name,
    sourceSize: source.size,
    pageCount,
    note: `${pageCount} pp`,
    warning: dropped
      ? 'Some characters were dropped: the built-in PDF fonts only cover Latin text.'
      : undefined,
  }
}
