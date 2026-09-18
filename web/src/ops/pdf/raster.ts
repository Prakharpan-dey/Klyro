import type { OutputFile, Progress } from '../types'
import { baseName, pdfLib, savePdf } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'
import { rebuildPdf } from './pages'

export type ColourFilter = 'none' | 'grayscale' | 'invert' | 'contrast'

export interface RasterParams {
  dpi: number
  /** JPEG quality 0-1; ignored for the PNG path */
  quality: number
  filter?: ColourFilter
  /** shrink quality until the whole document fits, if it can */
  targetKB?: number
  lossless?: boolean
}

const FILTERS: Record<ColourFilter, string> = {
  none: 'none',
  grayscale: 'grayscale(1)',
  invert: 'invert(1)',
  contrast: 'grayscale(1) contrast(1.6)',
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  )
}

/** Applies a canvas filter in place; returns the same canvas when no filter is set. */
function applyFilter(canvas: HTMLCanvasElement, filter: ColourFilter) {
  if (filter === 'none') return canvas
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')!
  ctx.filter = FILTERS[filter]
  ctx.drawImage(canvas, 0, 0)
  return out
}

/**
 * Renders every page to an image and rebuilds the document from those images.
 * Text stops being selectable, which is the trade for a smaller, flatter file.
 */
export async function rasterizePdf(
  file: File,
  params: RasterParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  const doc = await openPdf(file)
  const { PDFDocument } = await pdfLib()

  try {
    const scale = params.dpi / 72
    const pages: { canvas: HTMLCanvasElement; width: number; height: number }[] = []

    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(i, doc.numPages, `Rendering page ${i + 1}`)
      const page = await doc.getPage(i + 1)
      const viewport = page.getViewport({ scale: 1 })
      page.cleanup()
      const canvas = applyFilter(await renderPage(doc, i, scale), params.filter ?? 'none')
      pages.push({ canvas, width: viewport.width, height: viewport.height })
      // let the UI breathe between pages
      await new Promise((r) => setTimeout(r, 0))
    }

    const build = async (quality: number) => {
      const out = await PDFDocument.create()
      for (const { canvas, width, height } of pages) {
        const blob = params.lossless
          ? await toBlob(canvas, 'image/png')
          : await toBlob(canvas, 'image/jpeg', quality)
        const bytes = await blob.arrayBuffer()
        const image = params.lossless ? await out.embedPng(bytes) : await out.embedJpg(bytes)
        out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
      }
      return savePdf(out, `${baseName(file.name)}-${params.targetKB ? 'compressed' : 'raster'}.pdf`)
    }

    let result = await build(params.quality)
    let quality = params.quality
    let fits = true

    if (params.targetKB && !params.lossless) {
      const limit = params.targetKB * 1024
      fits = result.size <= limit
      let low = 0.1
      let high = params.quality
      for (let step = 0; step < 5 && !fits; step++) {
        quality = (low + high) / 2
        onProgress?.(doc.numPages, doc.numPages, `Trying quality ${quality.toFixed(2)}`)
        const attempt = await build(quality)
        if (attempt.size <= limit) {
          result = attempt
          fits = true
          low = quality
        } else {
          high = quality
          result = attempt
        }
      }
    }

    pages.forEach(({ canvas }) => {
      canvas.width = 0
      canvas.height = 0
    })

    return {
      file: result,
      sourceName: file.name,
      sourceSize: file.size,
      note: `${doc.numPages} pp · ${params.dpi} dpi${params.lossless ? '' : ` · Q ${quality.toFixed(2)}`}`,
      warning:
        params.targetKB && !fits
          ? `Could not reach ${params.targetKB} KB. Try a lower DPI.`
          : undefined,
    }
  } finally {
    await closePdf(doc)
  }
}

/** Share of pixels that are not near-white, used to spot blank pages. */
export async function inkCoverage(canvas: HTMLCanvasElement): Promise<number> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 1
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let inked = 0
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (luma < 240) inked++
  }
  return inked / (data.length / 4)
}

export interface BlankScanResult {
  /** 0-based page indices judged blank */
  blank: number[]
  /** ink coverage per page, as a share of pixels */
  coverage: number[]
}

export async function findBlankPages(
  file: File,
  thresholdPercent: number,
  onProgress?: Progress,
): Promise<BlankScanResult> {
  const doc = await openPdf(file)
  try {
    const coverage: number[] = []
    const blank: number[] = []
    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(i, doc.numPages, `Checking page ${i + 1}`)
      const canvas = await renderPage(doc, i, 0.5)
      const ink = await inkCoverage(canvas)
      canvas.width = 0
      canvas.height = 0
      coverage.push(ink)
      if (ink * 100 < thresholdPercent) blank.push(i)
      await new Promise((r) => setTimeout(r, 0))
    }
    return { blank, coverage }
  } finally {
    await closePdf(doc)
  }
}

export async function removeBlankPages(
  file: File,
  thresholdPercent: number,
  onProgress?: Progress,
): Promise<OutputFile> {
  const { blank, coverage } = await findBlankPages(file, thresholdPercent, onProgress)
  const keep = coverage.map((_, index) => index).filter((index) => !blank.includes(index))
  if (!keep.length) throw new Error('Every page looks blank at this threshold')

  const out = await rebuildPdf(
    file,
    keep.map((index) => ({ index, rotate: 0 })),
    '-no-blanks',
  )
  return { ...out, note: `${keep.length} kept · ${blank.length} removed` }
}
