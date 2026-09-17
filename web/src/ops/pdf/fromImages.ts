import type { OutputFile, Progress } from '../types'
import { runTransform } from '../image/pool'
import { pdfLib, savePdf } from './load'

export type PageSize = 'a4' | 'letter' | 'fit'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface ImagesToPdfParams {
  pageSize: PageSize
  orientation: Orientation
  marginMm: number
  name?: string
}

const PT_PER_MM = 72 / 25.4
const SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

async function embeddableBytes(file: File): Promise<{ bytes: ArrayBuffer; kind: 'jpg' | 'png' }> {
  if (file.type === 'image/jpeg') return { bytes: await file.arrayBuffer(), kind: 'jpg' }
  if (file.type === 'image/png') return { bytes: await file.arrayBuffer(), kind: 'png' }
  // pdf-lib only embeds JPEG and PNG, so re-encode anything else first
  const r = await runTransform(file, { format: 'image/jpeg', quality: 0.92 })
  return { bytes: await r.blob.arrayBuffer(), kind: 'jpg' }
}

export async function imagesToPdf(
  files: File[],
  params: ImagesToPdfParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const { PDFDocument } = await pdfLib()
  const doc = await PDFDocument.create()
  const margin = Math.max(0, params.marginMm) * PT_PER_MM

  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length, file.name)
    const { bytes, kind } = await embeddableBytes(file)
    const image = kind === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
    const landscapeImage = image.width > image.height

    let pageW: number
    let pageH: number
    if (params.pageSize === 'fit') {
      pageW = image.width + margin * 2
      pageH = image.height + margin * 2
    } else {
      const [w, h] = SIZES[params.pageSize]
      const landscape =
        params.orientation === 'landscape' || (params.orientation === 'auto' && landscapeImage)
      ;[pageW, pageH] = landscape ? [h, w] : [w, h]
    }

    const boxW = pageW - margin * 2
    const boxH = pageH - margin * 2
    const scale = Math.min(
      boxW / image.width,
      boxH / image.height,
      params.pageSize === 'fit' ? 1 : Infinity,
    )
    const drawW = image.width * scale
    const drawH = image.height * scale

    const page = doc.addPage([pageW, pageH])
    page.drawImage(image, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    })
  }

  onProgress?.(files.length, files.length, 'Writing')
  const file = await savePdf(doc, params.name ?? 'images.pdf')
  return {
    file,
    sourceName: `${files.length} image${files.length === 1 ? '' : 's'}`,
    sourceSize: files.reduce((n, f) => n + f.size, 0),
    note: `${doc.getPageCount()} pp`,
  }
}
