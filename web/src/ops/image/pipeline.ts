import {
  extensionFor,
  isLossy,
  nextScale,
  resolveSize,
  searchQuality,
  type ImageFormat,
  type ResizeSpec,
} from '@/lib/imageMath'

/** Below this the picture is no longer worth the bytes it saves. */
const MIN_SIDE = 48

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

async function toBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  const blob = await ('convertToBlob' in canvas
    ? canvas.convertToBlob({ type, quality })
    : new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
          type,
          quality,
        ),
      ))

  // A browser that cannot write this format quietly hands back a PNG instead,
  // which would otherwise be saved under the wrong extension.
  if (blob.type !== type) {
    throw new Error(`This browser cannot write ${extensionFor(type).toUpperCase()} files`)
  }
  return blob
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
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = draw(bitmap, width, height, format)
      if (isLossy(format)) {
        // AVIF encodes several times slower than JPEG, so it gets a shorter search
        const steps = format === 'image/avif' ? 5 : 7
        const r = await searchQuality((q) => toBlob(canvas, format, q), params.maxBytes, { steps })
        last = { blob: r.blob, width, height, quality: r.quality, fits: r.fits }
      } else {
        const blob = await toBlob(canvas, format)
        last = { blob, width, height, fits: blob.size <= params.maxBytes }
      }
      if (last.fits || width <= MIN_SIDE || height <= MIN_SIDE) break

      // aim straight at the target rather than creeping down a fixed step: a
      // PNG of a photo needs a much smaller picture, and ten 15% steps never
      // got there, so it arrived both smaller and bigger than where it started
      const scale = nextScale(last.blob.size, params.maxBytes)
      width = Math.max(MIN_SIDE, Math.round(width * scale))
      height = Math.max(MIN_SIDE, Math.round(height * scale))
    }
    return last!
  } finally {
    bitmap.close()
  }
}
