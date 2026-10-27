import type { OutputFile, Progress } from '../types'
import { runTransform } from '../image/pool'
import { baseName } from '../pdf/load'
import { closePdf, openPdf, renderPage } from '../pdf/pdfjs'
import { extractPageText } from '../pdf/text'
import {
  buildPptx,
  PPTX_MIME,
  SLIDE_16_9,
  SLIDE_4_3,
  slideSizeFor,
  type Slide,
  type SlideSize,
} from './pptx'

/** PDF pages and images, one per slide. */

function canvasBytes(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg') {
  return new Promise<Uint8Array>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject)
          : reject(new Error('Encoding failed')),
      type,
      0.9,
    ),
  )
}

function pptxFile(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], `${baseName(name)}.pptx`, { type: PPTX_MIME })
}

export interface PdfToPptxParams {
  dpi: number
  /** PNG keeps text crisp; JPEG keeps a deck of scans small */
  sharp: boolean
  /** put each page's text in the speaker notes */
  notes: boolean
}

export async function pdfToPptx(
  file: File,
  params: PdfToPptxParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const doc = await openPdf(file)
  try {
    const slides: Slide[] = []
    let size: SlideSize | null = null
    let withText = 0

    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(i, doc.numPages, `Page ${i + 1} of ${doc.numPages}`)

      const page = await doc.getPage(i + 1)
      const viewport = page.getViewport({ scale: 1 })
      page.cleanup()
      // the deck takes the shape of the first page; later pages are fitted into it
      size ??= slideSizeFor(viewport.width, viewport.height)

      const canvas = await renderPage(doc, i, params.dpi / 72)
      const text = params.notes ? (await extractPageText(doc, i)).trim() : undefined
      if (text) withText++

      slides.push({
        image: await canvasBytes(canvas, params.sharp ? 'image/png' : 'image/jpeg'),
        kind: params.sharp ? 'png' : 'jpg',
        width: canvas.width,
        height: canvas.height,
        notes: params.notes ? (text ?? '') : undefined,
        alt: `Page ${i + 1} of ${baseName(file.name)}`,
      })

      // let the UI breathe between pages
      await new Promise((r) => setTimeout(r, 0))
    }

    onProgress?.(doc.numPages, doc.numPages, 'Writing the presentation')
    const bytes = await buildPptx(slides, size ?? SLIDE_16_9)

    return {
      file: pptxFile(bytes, file.name),
      sourceName: file.name,
      sourceSize: file.size,
      note: `${slides.length} slide${slides.length === 1 ? '' : 's'}`,
      warning:
        params.notes && withText === 0
          ? 'No text was found for the notes. The PDF is probably scanned images.'
          : undefined,
    }
  } finally {
    closePdf(doc)
  }
}

export type DeckShape = '16:9' | '4:3' | 'first'

export interface ImagesToPptxParams {
  shape: DeckShape
  /** put each file name in its slide's notes */
  namesInNotes: boolean
  name?: string
}

export async function imagesToPptx(
  files: File[],
  params: ImagesToPptxParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const slides: Slide[] = []

  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length, file.name)
    // Always decoded and re-encoded, never passed through: PowerPoint does not
    // reliably honour a photo's EXIF rotation, so a portrait phone picture
    // would otherwise land on its side. PNG stays PNG to keep transparency.
    const png = file.type === 'image/png'
    const result = await runTransform(file, {
      format: png ? 'image/png' : 'image/jpeg',
      quality: 0.92,
    })

    slides.push({
      image: new Uint8Array(await result.blob.arrayBuffer()),
      kind: png ? 'png' : 'jpg',
      width: result.width,
      height: result.height,
      notes: params.namesInNotes ? file.name : undefined,
      alt: file.name,
    })
  }

  const first = slides[0]
  const size =
    params.shape === '4:3'
      ? SLIDE_4_3
      : params.shape === 'first' && first
        ? slideSizeFor(first.width, first.height)
        : SLIDE_16_9

  onProgress?.(files.length, files.length, 'Writing the presentation')
  const bytes = await buildPptx(slides, size)
  const name = params.name ?? (files.length === 1 ? files[0].name : 'images')

  return {
    file: pptxFile(bytes, name),
    sourceName: files.length === 1 ? files[0].name : `${files.length} images`,
    sourceSize: files.reduce((sum, f) => sum + f.size, 0),
    note: `${slides.length} slide${slides.length === 1 ? '' : 's'}`,
  }
}
