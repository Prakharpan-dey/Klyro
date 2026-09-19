import type { ImageFormat } from '@/lib/imageMath'

/**
 * Which image formats this browser can actually write.
 *
 * A browser that cannot encode a format does not throw: it quietly returns a
 * PNG instead. So the only honest test is to encode one pixel and look at what
 * came back. Chrome writes AVIF, Safari does not, and the tools use this to
 * offer only the formats that will really work.
 */

const CANDIDATES: ImageFormat[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

type Encode = (type: string) => Promise<Blob | null>

function onePixel(): Encode {
  return async (type) => {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(1, 1)
        canvas.getContext('2d')?.fillRect(0, 0, 1, 1)
        return await canvas.convertToBlob({ type })
      }
      if (typeof document === 'undefined') return null
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      canvas.getContext('2d')?.fillRect(0, 0, 1, 1)
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type))
    } catch {
      return null
    }
  }
}

export async function probeFormats(encode: Encode = onePixel()): Promise<Set<ImageFormat>> {
  const found = new Set<ImageFormat>()
  for (const format of CANDIDATES) {
    const blob = await encode(format)
    if (blob?.type === format) found.add(format)
  }
  // PNG is required by the canvas spec; keep the app usable if a probe misfires
  found.add('image/png')
  return found
}

let cached: Promise<Set<ImageFormat>> | null = null

/** Cached for the life of the tab; the answer cannot change while it is open. */
export function encodableFormats(): Promise<Set<ImageFormat>> {
  cached ??= probeFormats()
  return cached
}
