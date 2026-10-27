import {
  extensionFor,
  isLossy,
  nextScale,
  resolveSize,
  searchQuality,
  type ImageFormat,
  type ResizeSpec,
} from '@/lib/imageMath'
import {
  anchorBox,
  planGeometry,
  type CropBox,
  type Flip,
  type Geometry,
  type QuarterTurn,
  type Watermark,
} from './geometry'
import { toDecodable } from './heic'

/** Below this the picture is no longer worth the bytes it saves. */
const MIN_SIDE = 48

export interface TransformParams {
  /** 'keep' re-encodes in the source format (unsupported sources fall back to JPEG). */
  format: ImageFormat | 'keep'
  quality?: number
  maxBytes?: number
  resize?: ResizeSpec
  /** applied in this order, before resizing: crop, then turn and flip, then the mark */
  crop?: CropBox
  rotate?: QuarterTurn
  flip?: Flip
  watermark?: Watermark
}

/** Everything `draw` needs besides the bitmap; resolved once, then reused per attempt. */
interface Layout {
  geometry: Geometry
  rotate: QuarterTurn
  flip: Flip
  watermark?: Watermark
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

type Context = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

function drawWatermark(ctx: Context, width: number, height: number, mark: Watermark) {
  const text = mark.text.trim()
  if (!text) return
  // workers cannot load web fonts, so this is the system sans in every case
  const size = Math.max(8, Math.round(Math.min(width, height) * mark.size))
  ctx.save()
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textBaseline = 'top'
  ctx.globalAlpha = mark.opacity
  ctx.fillStyle = mark.colour === 'light' ? '#ffffff' : '#000000'
  // a hairline of the opposite colour keeps it legible on a busy photo
  ctx.strokeStyle = mark.colour === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, size / 24)

  const textWidth = ctx.measureText(text).width
  if (mark.tile) {
    const stepX = textWidth + size * 3
    const stepY = size * 4
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-Math.PI / 6)
    const reach = Math.hypot(width, height)
    for (let y = -reach; y < reach; y += stepY) {
      for (let x = -reach; x < reach; x += stepX) {
        ctx.strokeText(text, x, y)
        ctx.fillText(text, x, y)
      }
    }
  } else {
    const margin = Math.round(Math.min(width, height) * 0.03)
    const { x, y } = anchorBox({ width, height }, { width: textWidth, height: size }, mark.anchor, margin)
    ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)
  }
  ctx.restore()
}

function draw(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  format: ImageFormat,
  layout: Layout,
) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d') as Context | null
  if (!ctx) throw new Error('Canvas is not available')
  if (format === 'image/jpeg') {
    // JPEG has no alpha, so transparent pixels would turn black
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.imageSmoothingQuality = 'high'

  const { sx, sy, sw, sh } = layout.geometry
  const quarter = layout.rotate === 90 || layout.rotate === 270
  // the source is drawn upright into a box that, once turned, fills the canvas
  const drawWidth = quarter ? height : width
  const drawHeight = quarter ? width : height

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate((layout.rotate * Math.PI) / 180)
  ctx.scale(layout.flip === 'h' ? -1 : 1, layout.flip === 'v' ? -1 : 1)
  ctx.drawImage(bitmap, sx, sy, sw, sh, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()

  if (layout.watermark) drawWatermark(ctx, width, height, layout.watermark)
  return canvas
}

export async function transformImage(
  source: Blob,
  params: TransformParams,
): Promise<TransformResult> {
  // HEIC is decoded to PNG first where the browser cannot read it; the format
  // choice below still goes by the original, so "keep" on a photo gives a JPEG
  const decodable = await toDecodable(source)
  const bitmap = await createImageBitmap(decodable, { imageOrientation: 'from-image' })
  try {
    const format = pickFormat(params.format, source.type)
    const layout: Layout = {
      geometry: planGeometry({ width: bitmap.width, height: bitmap.height }, params.crop, params.rotate),
      rotate: params.rotate ?? 0,
      flip: params.flip ?? 'none',
      watermark: params.watermark,
    }
    let { width, height } = resolveSize(
      { width: layout.geometry.width, height: layout.geometry.height },
      params.resize,
    )
    const quality = params.quality ?? 0.9

    if (!params.maxBytes) {
      const blob = await toBlob(draw(bitmap, width, height, format, layout), format, quality)
      return { blob, width, height, quality: isLossy(format) ? quality : undefined, fits: true }
    }

    // Target size: lower quality first, then shrink dimensions if that is not enough.
    let last: TransformResult | null = null
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = draw(bitmap, width, height, format, layout)
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
