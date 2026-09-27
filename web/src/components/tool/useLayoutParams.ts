import { useState } from 'react'
import { LAYOUT_DEFAULTS, type LayoutParams } from '@/ops/office/layout'
import type { FontFamily } from '@/ops/pdf/stamp'

/**
 * The page setup shared by every document converter.
 *
 * Word, OpenDocument, RTF, EPUB and HTML all end at the same renderer, so they
 * offer the same four choices. Keeping the controls here means the five tools
 * stay consistent by construction rather than by anyone remembering to.
 */
export function useLayoutParams(overrides: Partial<LayoutParams> = {}) {
  const initial = { ...LAYOUT_DEFAULTS, ...overrides }
  const [pageSize, setPageSize] = useState<LayoutParams['pageSize']>(initial.pageSize)
  const [family, setFamily] = useState<FontFamily>(initial.family)
  const [size, setSize] = useState(initial.size)
  const [marginMm, setMarginMm] = useState(initial.marginMm)
  const [leading, setLeading] = useState(initial.leading)

  const params: LayoutParams = { pageSize, family, size, marginMm, leading }
  return {
    params,
    setPageSize,
    setFamily,
    setSize,
    setMarginMm,
    setLeading,
  }
}
