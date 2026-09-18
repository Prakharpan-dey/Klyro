import type { PDFDocument } from 'pdf-lib'
import type { OutputFile, Progress } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'

/**
 * Optical character recognition, in the tab.
 *
 * A scan is a picture of words, so nothing can search or copy it. Tesseract
 * reads the picture and returns the words with their positions; those go back
 * onto the original page as an invisible layer, leaving the page exactly as it
 * looked while making it searchable.
 *
 * The engine and the language models are served from this origin (see
 * scripts/ocr-assets.mjs). The first run downloads a few megabytes of model,
 * the browser keeps it, and no part of your file is ever sent anywhere.
 */

export type OcrLanguage = 'eng' | 'hin' | 'eng+hin'

export interface OcrParams {
  language: OcrLanguage
  /** resolution the page is rendered at before reading; higher is slower */
  dpi: number
  /** put the words back on the page, or just hand back a text file */
  output: 'searchable' | 'text'
}

export class OcrError extends Error {}

interface PageResult {
  text: string
  /** a one-page PDF holding only the invisible text layer */
  layer: Uint8Array | null
  confidence: number
}

type Recognizer = {
  read: (image: HTMLCanvasElement | File, wantLayer: boolean) => Promise<PageResult>
  close: () => Promise<void>
}

const base = import.meta.env.BASE_URL

async function startEngine(
  params: OcrParams,
  onStage: (label: string) => void,
): Promise<Recognizer> {
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker(params.language, 1, {
    workerPath: `${base}ocr/worker.min.js`,
    corePath: `${base}ocr/`,
    langPath: `${base}ocr/lang`,
    gzip: true,
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status === 'loading tesseract core') onStage('Starting the reader')
      else if (message.status?.startsWith('load')) onStage('Loading the language')
    },
  })

  return {
    async read(image, wantLayer) {
      const { data } = await worker.recognize(
        image,
        { pdfTextOnly: true },
        { text: true, pdf: wantLayer },
      )
      const pdf = (data as { pdf?: number[] | Uint8Array | null }).pdf
      return {
        text: data.text ?? '',
        layer: pdf ? Uint8Array.from(pdf) : null,
        confidence: data.confidence ?? 0,
      }
    },
    close: async () => {
      await worker.terminate()
    },
  }
}

/** Draws a one-page text layer over a page, stretched to fit it exactly. */
async function layerOnto(target: PDFDocument, pageIndex: number, layer: Uint8Array) {
  const { PDFDocument } = await pdfLib()
  const source = await PDFDocument.load(layer)
  const [first] = source.getPages()
  if (!first) return
  const embedded = await target.embedPage(first)
  const page = target.getPage(pageIndex)
  const { width, height } = page.getSize()
  page.drawPage(embedded, { x: 0, y: 0, width, height })
}

function textFile(file: File, pages: string[]): OutputFile {
  const text = pages.join('\n\n')
  return {
    file: new File([text], `${baseName(file.name)}.txt`, { type: 'text/plain' }),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${text.trim().split(/\s+/).filter(Boolean).length} words`,
  }
}

async function ocrPdf(
  file: File,
  engine: Recognizer,
  params: OcrParams,
  report: (page: number, pages: number) => void,
): Promise<OutputFile> {
  const doc = await openPdf(file)
  const pages: string[] = []
  const layers: (Uint8Array | null)[] = []
  let confidence = 0

  try {
    for (let i = 0; i < doc.numPages; i++) {
      report(i, doc.numPages)
      const canvas = await renderPage(doc, i, params.dpi / 72)
      const result = await engine.read(canvas, params.output === 'searchable')
      canvas.width = 0
      canvas.height = 0
      pages.push(result.text.trim())
      layers.push(result.layer)
      confidence += result.confidence
    }
  } finally {
    await closePdf(doc)
  }

  if (params.output === 'text') return textFile(file, pages)

  const target = await loadPdf(file)
  for (const [i, layer] of layers.entries()) if (layer) await layerOnto(target, i, layer)

  const words = pages.join(' ').split(/\s+/).filter(Boolean).length
  return {
    file: await savePdf(target, `${baseName(file.name)}-searchable.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${words} words · ${Math.round(confidence / Math.max(1, layers.length))}% sure`,
    warning: words ? undefined : 'No text was found on these pages.',
  }
}

async function ocrImage(file: File, engine: Recognizer, params: OcrParams): Promise<OutputFile> {
  const result = await engine.read(file, params.output === 'searchable')
  if (params.output === 'text') return textFile(file, [result.text.trim()])

  const { PDFDocument } = await pdfLib()
  const doc = await PDFDocument.create()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const image =
    file.type === 'image/png'
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes).catch(() => null)
  if (!image) throw new OcrError('Only JPG and PNG images can be turned into a searchable PDF')

  // a pixel becomes a point, which is the scale Tesseract assumes as well
  const page = doc.addPage([image.width, image.height])
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  if (result.layer) await layerOnto(doc, 0, result.layer)

  const words = result.text.split(/\s+/).filter(Boolean).length
  return {
    file: await savePdf(doc, `${baseName(file.name)}-searchable.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${words} words · ${Math.round(result.confidence)}% sure`,
    warning: words ? undefined : 'No text was found in this image.',
  }
}

export async function runOcr(
  files: File[],
  params: OcrParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  onProgress?.(0, files.length, 'Starting the reader')
  const engine = await startEngine(params, (label) => onProgress?.(0, files.length, label))

  try {
    const out: OutputFile[] = []
    for (const [i, file] of files.entries()) {
      const report = (page: number, pages: number) =>
        onProgress?.(i, files.length, `${file.name} · page ${page + 1} of ${pages}`)

      out.push(
        file.type === 'application/pdf'
          ? await ocrPdf(file, engine, params, report)
          : await ocrImage(file, engine, params),
      )
    }
    onProgress?.(files.length, files.length, 'Done')
    return out
  } finally {
    await engine.close()
  }
}
