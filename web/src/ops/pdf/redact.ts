import type { OutputFile, Progress } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'
import { extractPageItems, type TextPiece } from './text'

/**
 * Removes content from a PDF rather than covering it up.
 *
 * The obvious implementation — draw a black rectangle over the words — is the
 * wrong one, and it is the one that leaks. A rectangle is just another object
 * painted on top; the text underneath is still in the file, still selectable,
 * still returned by any extractor. Documents have been un-redacted this way in
 * public more than once.
 *
 * So a page carrying a redaction is rendered to an image, the black boxes are
 * painted onto that image, and the image replaces the page. The original
 * content stream is discarded, which means the covered pixels are the only
 * record that ever existed. Pages with nothing to redact are copied across
 * untouched, so the rest of the document keeps its text, its selectability and
 * its size.
 *
 * Coordinates here are PDF points with a bottom-left origin, matching what
 * `extractPageItems` returns. The conversion to top-left canvas pixels happens
 * in one place, at the point of drawing.
 */

export interface RedactBox {
  /** zero based */
  page: number
  /** bottom-left corner, in PDF points */
  x: number
  y: number
  width: number
  height: number
}

export interface RedactParams {
  /** boxes drawn by hand on the page preview */
  boxes: RedactBox[]
  /** strings to find and cover wherever they appear */
  terms: string[]
  /** resolution the redacted pages are rebuilt at */
  dpi: number
}

export interface RedactResult extends OutputFile {
  /** how many boxes were painted, so the UI can say what happened */
  covered: number
  /** pages that were rebuilt as images */
  rebuilt: number
}

/** Grows a box a little so descenders and antialiasing are inside it. */
const PAD = 1.5

/**
 * Boxes covering every occurrence of `term` in one run of text.
 *
 * A run's width is known but not its per-character widths, so the offset is
 * taken as a proportion of the string. That is exact for a monospaced font and
 * close enough elsewhere once the padding is added — and it errs by covering
 * slightly more than the term, never less.
 */
export function boxesForTerm(piece: TextPiece, term: string, page: number): RedactBox[] {
  if (!term) return []
  const haystack = piece.str.toLowerCase()
  const needle = term.toLowerCase()
  const boxes: RedactBox[] = []

  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) break
    const perChar = piece.width / Math.max(piece.str.length, 1)
    boxes.push({
      page,
      x: piece.x + perChar * at - PAD,
      y: piece.y - piece.height * 0.25 - PAD,
      width: perChar * needle.length + PAD * 2,
      height: piece.height * 1.25 + PAD * 2,
    })
    from = at + needle.length
  }

  return boxes
}

/** Every box needed to cover `terms` across the whole document. */
export async function findTerms(file: File, terms: string[]): Promise<RedactBox[]> {
  const wanted = terms.map((t) => t.trim()).filter(Boolean)
  if (!wanted.length) return []

  const doc = await openPdf(file)
  try {
    const boxes: RedactBox[] = []
    for (let i = 0; i < doc.numPages; i++) {
      const pieces = await extractPageItems(doc, i)
      for (const piece of pieces) {
        for (const term of wanted) boxes.push(...boxesForTerm(piece, term, i))
      }
    }
    return boxes
  } finally {
    closePdf(doc)
  }
}

export function pagesTouched(boxes: RedactBox[]): Set<number> {
  return new Set(boxes.map((box) => box.page))
}

/** A box drawn on a preview, as fractions of the page from its top-left corner. */
export interface FractionBox {
  page: number
  x: number
  y: number
  w: number
  h: number
}

/**
 * Turns a box drawn on screen into one the op can use.
 *
 * The preview measures from the top-left because that is how the browser lays
 * out; PDF counts from the bottom-left. Doing the flip here, once, keeps the
 * component free of PDF geometry and leaves this testable without a canvas.
 */
export function fractionToBox(
  box: FractionBox,
  size: { width: number; height: number },
): RedactBox {
  return {
    page: box.page,
    x: box.x * size.width,
    y: (1 - box.y - box.h) * size.height,
    width: box.w * size.width,
    height: box.h * size.height,
  }
}

export class NothingToRedactError extends Error {
  constructor() {
    super('Nothing matched. Draw a box on the page, or check the spelling of the term.')
  }
}

export async function redactPdf(
  file: File,
  params: RedactParams,
  onProgress?: Progress,
): Promise<RedactResult> {
  onProgress?.(0, 1, 'Looking for matches')
  const found = await findTerms(file, params.terms)
  const boxes = [...params.boxes, ...found]
  if (!boxes.length) throw new NothingToRedactError()

  const touched = pagesTouched(boxes)
  const source = await loadPdf(file)
  const doc = await openPdf(file)
  const { PDFDocument } = await pdfLib()

  try {
    const out = await PDFDocument.create()
    const count = source.getPageCount()
    const scale = params.dpi / 72

    for (let i = 0; i < count; i++) {
      onProgress?.(i, count, `Page ${i + 1} of ${count}`)

      if (!touched.has(i)) {
        const [copied] = await out.copyPages(source, [i])
        out.addPage(copied)
        continue
      }

      const { width, height } = source.getPage(i).getSize()
      const canvas = await renderPage(doc, i, scale)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#000000'

      for (const box of boxes) {
        if (box.page !== i) continue
        // PDF points count up from the bottom, canvas pixels down from the top
        ctx.fillRect(
          box.x * scale,
          (height - box.y - box.height) * scale,
          box.width * scale,
          box.height * scale,
        )
      }

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/png'),
      )
      const image = await out.embedPng(await blob.arrayBuffer())
      out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })

      // let the UI breathe between pages
      await new Promise((r) => setTimeout(r, 0))
    }

    // a redacted document should not advertise its own history
    out.setProducer('Klyro')
    out.setCreator('Klyro')

    return {
      file: await savePdf(out, `${baseName(file.name)}-redacted.pdf`),
      sourceName: file.name,
      sourceSize: file.size,
      covered: boxes.length,
      rebuilt: touched.size,
      note: `${boxes.length} covered · ${touched.size} pp rebuilt`,
    }
  } finally {
    closePdf(doc)
  }
}
