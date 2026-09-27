import type { OutputFile, Progress } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { fractionToBox, type FractionBox } from './redact'
import { anchorPosition, embedFont, mmToPt, stripNonLatin, type Anchor } from './stamp'

/**
 * Marks a document up without changing what it says.
 *
 * The opposite of redaction, and worth keeping apart from it for that reason:
 * nothing here removes anything, and the text under a highlight stays
 * selectable and searchable. Highlights are drawn with a multiply blend so the
 * words show through, the way a marker pen behaves on paper.
 *
 * Marks are real page content rather than PDF annotation objects. Annotations
 * are easy to write and easy for a reader to hide, move or strip; a highlight
 * that vanishes in whatever the recipient opens it in is worse than none.
 */

export type HighlightColour = 'yellow' | 'green' | 'pink' | 'blue'

const COLOURS: Record<HighlightColour, [number, number, number]> = {
  yellow: [1, 0.92, 0.23],
  green: [0.45, 0.9, 0.45],
  pink: [1, 0.55, 0.75],
  blue: [0.5, 0.8, 1],
}

export interface AnnotateParams {
  /** areas to highlight, as fractions of their page */
  highlights: FractionBox[]
  colour: HighlightColour
  /** a short note stamped in the same place on every page it applies to */
  note?: string
  noteAnchor: Anchor
  /** pages the note goes on; the highlights carry their own page numbers */
  notePages: number[]
  noteSize: number
}

export class NothingToMarkError extends Error {
  constructor() {
    super('Nothing to add. Drag across the page to highlight, or write a note.')
  }
}

export async function annotatePdf(
  file: File,
  params: AnnotateParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const note = stripNonLatin(params.note?.trim() ?? '')
  if (!params.highlights.length && !note) throw new NothingToMarkError()

  onProgress?.(0, 1, 'Opening the document')
  const doc = await loadPdf(file)
  const { BlendMode, rgb } = await pdfLib()
  const [r, g, b] = COLOURS[params.colour]
  const font = await embedFont(doc, 'helvetica', false)

  const pages = doc.getPages()
  let marks = 0

  for (const highlight of params.highlights) {
    const page = pages[highlight.page]
    if (!page) continue

    const box = fractionToBox(highlight, page.getSize())
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: rgb(r, g, b),
      // without this the fill would sit on top of the words and hide them
      blendMode: BlendMode.Multiply,
    })
    marks++
  }

  if (note) {
    const width = font.widthOfTextAtSize(note, params.noteSize)
    const padding = params.noteSize * 0.5

    for (const index of params.notePages) {
      const page = pages[index]
      if (!page) continue

      const { x, y } = anchorPosition(
        page,
        width + padding * 2,
        params.noteSize + padding * 2,
        params.noteAnchor,
        mmToPt(12),
      )

      page.drawRectangle({
        x,
        y,
        width: width + padding * 2,
        height: params.noteSize + padding * 2,
        color: rgb(r, g, b),
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.5,
      })
      page.drawText(note, {
        x: x + padding,
        y: y + padding,
        size: params.noteSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      marks++
    }
  }

  onProgress?.(1, 1, 'Saving')

  return {
    file: await savePdf(doc, `${baseName(file.name)}-marked.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${marks} mark${marks === 1 ? '' : 's'}`,
  }
}
