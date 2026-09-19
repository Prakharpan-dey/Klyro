import { useEffect, useState } from 'react'
import type { ImageFormat } from '@/lib/imageMath'
import { encodableFormats } from '@/ops/image/support'

/**
 * Offers only the formats this browser can really write. AVIF is the one that
 * varies: Chrome writes it, Safari does not, and a browser that cannot write a
 * format returns a PNG rather than an error, so it has to be probed.
 */

const LABELS: Record<ImageFormat, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
}

export function useImageFormats(candidates: ImageFormat[]) {
  const [supported, setSupported] = useState<Set<ImageFormat> | null>(null)

  useEffect(() => {
    let cancelled = false
    encodableFormats().then((found) => !cancelled && setSupported(found))
    return () => {
      cancelled = true
    }
  }, [])

  // until the probe answers, show the formats every browser has had for a decade
  const usable = candidates.filter((format) =>
    supported ? supported.has(format) : format !== 'image/avif',
  )
  const missing = supported ? candidates.filter((format) => !supported.has(format)) : []

  return {
    options: usable.map((format) => ({ value: format, label: LABELS[format] })),
    missing: missing.map((format) => LABELS[format]),
  }
}
