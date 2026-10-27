/**
 * Where the pixels go when an image is cropped, turned and marked.
 *
 * Kept apart from the canvas so it can be tested in node: an off-by-one here
 * is a sliver of the wrong picture on every exported photo, and the test suite
 * has no canvas to catch it with.
 */

export type QuarterTurn = 0 | 90 | 180 | 270
export type Flip = 'none' | 'h' | 'v'

/** Fractions of the image, measured from its top-left corner. */
export interface CropBox {
  x: number
  y: number
  w: number
  h: number
}

export type WatermarkAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface Watermark {
  text: string
  /** 0 to 1 */
  opacity: number
  /** text height as a fraction of the picture's shorter side */
  size: number
  anchor: WatermarkAnchor
  /** repeat across the whole picture at an angle */
  tile: boolean
  colour: 'light' | 'dark'
}

export interface Geometry {
  /** source rectangle in the decoded bitmap, in pixels */
  sx: number
  sy: number
  sw: number
  sh: number
  /** size before any resize: the crop, turned if the turn is a quarter */
  width: number
  height: number
}

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n))

/**
 * The source rectangle for a crop, rounded to whole pixels and kept inside the
 * image. A crop that rounds to nothing keeps one pixel rather than failing.
 */
export function cropRect(
  source: { width: number; height: number },
  crop: CropBox | undefined,
): { sx: number; sy: number; sw: number; sh: number } {
  if (!crop) return { sx: 0, sy: 0, sw: source.width, sh: source.height }
  const sx = clamp(Math.round(crop.x * source.width), 0, source.width - 1)
  const sy = clamp(Math.round(crop.y * source.height), 0, source.height - 1)
  const right = clamp(Math.round((crop.x + crop.w) * source.width), sx + 1, source.width)
  const bottom = clamp(Math.round((crop.y + crop.h) * source.height), sy + 1, source.height)
  return { sx, sy, sw: right - sx, sh: bottom - sy }
}

export function planGeometry(
  source: { width: number; height: number },
  crop: CropBox | undefined,
  rotate: QuarterTurn = 0,
): Geometry {
  const rect = cropRect(source, crop)
  const quarter = rotate === 90 || rotate === 270
  return {
    ...rect,
    width: quarter ? rect.sh : rect.sw,
    height: quarter ? rect.sw : rect.sh,
  }
}

/** Top-left corner for a box of the given size at an anchor, inside a margin. */
export function anchorBox(
  canvas: { width: number; height: number },
  box: { width: number; height: number },
  anchor: WatermarkAnchor,
  margin: number,
): { x: number; y: number } {
  const [vertical, horizontal] = anchor === 'center' ? ['center', 'center'] : anchor.split('-')
  const x =
    horizontal === 'left'
      ? margin
      : horizontal === 'right'
        ? canvas.width - margin - box.width
        : (canvas.width - box.width) / 2
  const y =
    vertical === 'top'
      ? margin
      : vertical === 'bottom'
        ? canvas.height - margin - box.height
        : (canvas.height - box.height) / 2
  return { x, y }
}

/** Free, or a fixed shape; used by the crop box and by its numeric fields. */
export type Aspect = 'free' | '1:1' | '4:3' | '3:2' | '16:9'

const RATIOS: Record<Exclude<Aspect, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
}

/**
 * The largest centred crop of a given pixel shape. The ratio is of pixels, so
 * on a non-square picture the fractions differ: 1:1 on a 4000×3000 photo is
 * 0.75 of its width by all of its height.
 */
export function aspectCrop(
  source: { width: number; height: number },
  aspect: Aspect,
  portrait = false,
): CropBox {
  if (aspect === 'free') return { x: 0, y: 0, w: 1, h: 1 }
  const ratio = portrait ? 1 / RATIOS[aspect] : RATIOS[aspect]
  const sourceRatio = source.width / source.height
  if (sourceRatio > ratio) {
    const w = ratio / sourceRatio
    return { x: (1 - w) / 2, y: 0, w, h: 1 }
  }
  const h = sourceRatio / ratio
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}

/** Keeps a box inside the image and at least a sliver wide. */
export function clampCrop(box: CropBox, min = 0.02): CropBox {
  const w = clamp(box.w, min, 1)
  const h = clamp(box.h, min, 1)
  return { x: clamp(box.x, 0, 1 - w), y: clamp(box.y, 0, 1 - h), w, h }
}
