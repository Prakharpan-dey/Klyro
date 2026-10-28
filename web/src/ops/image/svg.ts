import { renameWithExt, type ImageFormat, type Size } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'

/**
 * SVG to a picture of it.
 *
 * The image worker pool cannot help here: createImageBitmap rejects SVG, and a
 * worker has no <img> to load one into. So this runs on the page. The SVG is
 * loaded as an image, which is the browser's own sandbox for it: scripts do
 * not run and nothing outside the file is fetched, whatever the file asks for.
 */

export class SvgError extends Error {}

/** What a browser uses for an SVG that gives no size at all. */
export const DEFAULT_SVG_SIZE: Size = { width: 300, height: 150 }

const MAX_SIDE = 16_384
const MAX_PIXELS = 100_000_000

/** CSS pixels per unit, the same table a browser uses. */
const UNITS: Record<string, number> = {
  '': 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 's').exec(tag)
  return match?.[2].trim()
}

/** An absolute length in pixels; undefined for a percentage, an em, or junk. */
export function svgLength(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = /^\+?(\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-z]*)$/i.exec(value)
  if (!match) return undefined
  const factor = UNITS[match[2].toLowerCase()]
  if (factor === undefined) return undefined
  const n = Number(match[1]) * factor
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * The size an SVG draws at by default.
 *
 * Width and height win when both are absolute. One of them plus a viewBox gives
 * the other from its shape. A viewBox alone gives its own size, which is what
 * design tools write for an icon. Nothing usable at all falls back to 300×150.
 */
export function svgSize(text: string): Size {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0]
  if (!tag) throw new SvgError('This is not an SVG file')

  const width = svgLength(attribute(tag, 'width'))
  const height = svgLength(attribute(tag, 'height'))
  const box = attribute(tag, 'viewBox')
    ?.split(/[\s,]+/)
    .map(Number)
  const viewBox =
    box && box.length === 4 && box[2] > 0 && box[3] > 0
      ? { width: box[2], height: box[3] }
      : undefined

  if (width && height) return { width, height }
  if (viewBox) {
    const ratio = viewBox.width / viewBox.height
    if (width) return { width, height: width / ratio }
    if (height) return { width: height * ratio, height }
    return viewBox
  }
  return { width: width ?? DEFAULT_SVG_SIZE.width, height: height ?? DEFAULT_SVG_SIZE.height }
}

export type SvgOutputSize = { mode: 'scale'; scale: number } | { mode: 'width'; width: number }

/** The pixel size of the result, refused before a canvas that big is tried. */
export function svgOutputSize(natural: Size, size: SvgOutputSize): Size {
  const factor = size.mode === 'scale' ? size.scale : size.width / natural.width
  const out = {
    width: Math.max(1, Math.round(natural.width * factor)),
    height: Math.max(1, Math.round(natural.height * factor)),
  }
  if (out.width > MAX_SIDE || out.height > MAX_SIDE || out.width * out.height > MAX_PIXELS) {
    throw new SvgError(
      `${out.width}×${out.height} is more than a browser can draw. Pick a smaller size.`,
    )
  }
  return out
}

export interface SvgParams {
  format: ImageFormat
  size: SvgOutputSize
  /** a colour for the transparent parts; JPG always gets one, white by default */
  background?: string
}

/** Pins the drawing size on the root element, so it is drawn sharp rather than stretched. */
function sized(text: string, out: Size): string {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (doc.querySelector('parsererror') || root.localName !== 'svg') {
    throw new SvgError('This SVG could not be read; it may be damaged')
  }
  // without a viewBox the drawing would not scale with the new size
  if (!root.hasAttribute('viewBox')) {
    const natural = svgSize(text)
    root.setAttribute('viewBox', `0 0 ${natural.width} ${natural.height}`)
  }
  root.setAttribute('width', String(out.width))
  root.setAttribute('height', String(out.height))
  return new XMLSerializer().serializeToString(doc)
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new SvgError('This SVG could not be drawn'))
    image.src = url
  })
}

export async function rasterizeSvg(file: File, params: SvgParams): Promise<OutputFile> {
  const text = await file.text()
  const out = svgOutputSize(svgSize(text), params.size)
  const url = URL.createObjectURL(new Blob([sized(text, out)], { type: 'image/svg+xml' }))

  try {
    const image = await load(url)
    const canvas = document.createElement('canvas')
    canvas.width = out.width
    canvas.height = out.height
    const ctx = canvas.getContext('2d')!
    const background = params.background ?? (params.format === 'image/jpeg' ? '#ffffff' : undefined)
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, out.width, out.height)
    }
    ctx.drawImage(image, 0, 0, out.width, out.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, params.format, 0.92),
    )
    canvas.width = 0
    canvas.height = 0
    if (!blob || blob.type !== params.format) {
      throw new SvgError('This browser cannot save that format; try PNG')
    }

    return {
      file: new File([blob], renameWithExt(file.name, params.format), { type: params.format }),
      sourceName: file.name,
      sourceSize: file.size,
      width: out.width,
      height: out.height,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function rasterizeSvgs(
  files: File[],
  params: SvgParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const results: OutputFile[] = []
  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length, file.name)
    results.push(await rasterizeSvg(file, params))
  }
  onProgress?.(files.length, files.length, 'Done')
  return results
}
