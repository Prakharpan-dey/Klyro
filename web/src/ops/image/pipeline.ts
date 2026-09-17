import {
  isLossy,
  resolveSize,
  searchQuality,
  type ImageFormat,
  type ResizeSpec,
} from '@/lib/imageMath'

export interface TransformParams {
  /** 'keep' re-encodes in the source format (unsupported sources fall back to JPEG). */
  format: ImageFormat | 'keep'
  quality?: number
  maxBytes?: number
  resize?: ResizeSpec
}

export interface TransformResult {
  blob: Blob
  width: number
  height: number
  quality?: number
  fits: boolean
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

function toBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  )
}

function pickFormat(requested: TransformParams['format'], sourceType: string): ImageFormat {
  if (requested !== 'keep') return requested
  if (sourceType === 'image/png' || sourceType === 'image/webp') return sourceType
  return 'image/jpeg'
}

function draw(bitmap: ImageBitmap, width: number, height: number, format: ImageFormat) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d') as
    OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
  if (!ctx) throw new Error('Canvas is not available')
  if (format === 'image/jpeg') {
    // JPEG has no alpha, so transparent pixels would turn black
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas
}

export async function transformImage(
  source: Blob,
  params: TransformParams,
): Promise<TransformResult> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const format = pickFormat(params.format, source.type)
    let { width, height } = resolveSize(
      { width: bitmap.width, height: bitmap.height },
      params.resize,
    )
    const quality = params.quality ?? 0.9

    if (!params.maxBytes) {
      const blob = await toBlob(draw(bitmap, width, height, format), format, quality)
      return { blob, width, height, quality: isLossy(format) ? quality : undefined, fits: true }
    }

    // Target size: lower quality first, then shrink dimensions if that is not enough.
    let last: TransformResult | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = draw(bitmap, width, height, format)
      if (isLossy(format)) {
        const r = await searchQuality((q) => toBlob(canvas, format, q), params.maxBytes)
        last = { blob: r.blob, width, height, quality: r.quality, fits: r.fits }
      } else {
        const blob = await toBlob(canvas, format)
        last = { blob, width, height, fits: blob.size <= params.maxBytes }
      }
      if (last.fits || width <= 64 || height <= 64) break
      width = Math.round(width * 0.85)
      height = Math.round(height * 0.85)
    }
    return last!
  } finally {
    bitmap.close()
  }
}
