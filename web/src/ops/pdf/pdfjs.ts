import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let lib: Promise<typeof import('pdfjs-dist')> | null = null

function pdfjs() {
  lib ??= import('pdfjs-dist').then((m) => {
    m.GlobalWorkerOptions.workerSrc = workerUrl
    return m
  })
  return lib
}

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  const { getDocument } = await pdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  return getDocument({ data }).promise
}

export function closePdf(doc: PDFDocumentProxy) {
  return doc.loadingTask.destroy()
}

/** Renders a page onto a new canvas. `scale` 1 = 72 dpi. */
export async function renderPage(
  doc: PDFDocumentProxy,
  index: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(index + 1)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  // The print intent renders without requestAnimationFrame, so it keeps going
  // when the tab is in the background instead of stalling until it is visible again.
  await page.render({ canvas, viewport, background: '#ffffff', intent: 'print' }).promise
  page.cleanup()
  return canvas
}

/** Renders a page scaled to a target pixel width, for thumbnails. */
export async function renderThumbnail(doc: PDFDocumentProxy, index: number, width: number) {
  const page = await doc.getPage(index + 1)
  const base = page.getViewport({ scale: 1 })
  return renderPage(doc, index, (width * (window.devicePixelRatio || 1)) / base.width)
}
