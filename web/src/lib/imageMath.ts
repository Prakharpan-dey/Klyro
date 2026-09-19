export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

export type ResizeSpec =
  | { mode: 'px'; width?: number; height?: number; keepAspect: boolean }
  | { mode: 'percent'; percent: number }
  | { mode: 'cm'; width?: number; height?: number; dpi: number; keepAspect: boolean }

export interface Size {
  width: number
  height: number
}

const MAX_SIDE = 16384

export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi)
}

function clampSide(n: number): number {
  return Math.min(MAX_SIDE, Math.max(1, Math.round(n)))
}

/** Resolves the output size for a resize request. Missing sides keep the source ratio. */
export function resolveSize(source: Size, spec: ResizeSpec | undefined): Size {
  if (!spec) return source
  const ratio = source.width / source.height

  if (spec.mode === 'percent') {
    const f = spec.percent / 100
    return { width: clampSide(source.width * f), height: clampSide(source.height * f) }
  }

  let w = spec.mode === 'cm' && spec.width ? cmToPx(spec.width, spec.dpi) : spec.width
  let h = spec.mode === 'cm' && spec.height ? cmToPx(spec.height, spec.dpi) : spec.height

  if (!w && !h) return source
  if (w && !h) h = w / ratio
  else if (h && !w) w = h * ratio
  else if (w && h && spec.keepAspect) {
    // fit inside the box
    const scale = Math.min(w / source.width, h / source.height)
    w = source.width * scale
    h = source.height * scale
  }
  return { width: clampSide(w!), height: clampSide(h!) }
}

export function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'application/pdf':
      return 'pdf'
    case 'video/mp4':
      return 'mp4'
    case 'video/webm':
      return 'webm'
    case 'audio/mp4':
      return 'm4a'
    case 'audio/webm':
      return 'weba'
    default:
      return mime.split('/')[1] ?? 'bin'
  }
}

export function renameWithExt(name: string, mime: string, suffix = ''): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}${suffix}.${extensionFor(mime)}`
}

export function isLossy(format: ImageFormat): boolean {
  return format !== 'image/png'
}

/**
 * How much to shrink after an encode overshot the target.
 *
 * File size follows pixel count, so the square root of how far off we are
 * lands close to the target in one step. Clamped so a wild miss cannot erase
 * the picture in a single jump, and so a near miss still makes progress.
 */
export function nextScale(actualBytes: number, maxBytes: number): number {
  if (!(actualBytes > 0) || !(maxBytes > 0)) return 0.85
  return Math.min(0.9, Math.max(0.35, Math.sqrt(maxBytes / actualBytes)))
}

export interface QualitySearchResult {
  blob: Blob
  quality: number
  fits: boolean
}

/**
 * Binary search for the highest quality whose output is at most maxBytes.
 * If even the lowest quality is too big, returns that smallest attempt with fits = false.
 */
export async function searchQuality(
  encode: (quality: number) => Promise<Blob>,
  maxBytes: number,
  { min = 0.05, max = 0.95, steps = 7 } = {},
): Promise<QualitySearchResult> {
  const top = await encode(max)
  if (top.size <= maxBytes) return { blob: top, quality: max, fits: true }

  let lo = min
  let hi = max
  let best: QualitySearchResult | null = null

  for (let i = 0; i < steps; i++) {
    const q = (lo + hi) / 2
    const blob = await encode(q)
    if (blob.size <= maxBytes) {
      best = { blob, quality: q, fits: true }
      lo = q
    } else {
      hi = q
    }
  }
  if (best) return best

  const floor = await encode(min)
  return { blob: floor, quality: min, fits: floor.size <= maxBytes }
}
