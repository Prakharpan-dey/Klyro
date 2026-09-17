import { extensionFor } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'
import { baseName } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'

export interface PdfToImagesParams {
  format: 'image/jpeg' | 'image/png'
  dpi: number
  quality?: number
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  )
}

export async function pdfToImages(
  files: File[],
  params: PdfToImagesParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const results: OutputFile[] = []
  const docs = await Promise.all(files.map((f) => openPdf(f)))
  const total = docs.reduce((n, d) => n + d.numPages, 0)
  let done = 0

  for (const [fi, doc] of docs.entries()) {
    const file = files[fi]
    const digits = String(doc.numPages).length
    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(done, total, `${file.name} · page ${i + 1}`)
      const canvas = await renderPage(doc, i, params.dpi / 72)
      const blob = await canvasToBlob(canvas, params.format, params.quality ?? 0.92)
      const name = `${baseName(file.name)}-${String(i + 1).padStart(digits, '0')}.${extensionFor(params.format)}`
      results.push({
        file: new File([blob], name, { type: params.format }),
        sourceName: file.name,
        // share of the source, so totals stay meaningful
        sourceSize: Math.round(file.size / doc.numPages),
        width: canvas.width,
        height: canvas.height,
        note: `p${i + 1}`,
      })
      canvas.width = canvas.height = 0
      done++
      // let the UI breathe between pages
      await new Promise((r) => setTimeout(r, 0))
    }
    await closePdf(doc)
  }

  onProgress?.(total, total, 'Done')
  return results
}
