import { describe, expect, it } from 'vitest'
import { cmToPx, renameWithExt, resolveSize, searchQuality } from './imageMath'

const src = { width: 4000, height: 3000 }

describe('cmToPx', () => {
  it('converts passport photo width at 300 dpi', () => {
    expect(cmToPx(3.5, 300)).toBe(413)
  })
})

describe('resolveSize', () => {
  it('returns the source when nothing is set', () => {
    expect(resolveSize(src, undefined)).toEqual(src)
    expect(resolveSize(src, { mode: 'px', keepAspect: true })).toEqual(src)
  })

  it('scales by percent', () => {
    expect(resolveSize(src, { mode: 'percent', percent: 25 })).toEqual({ width: 1000, height: 750 })
  })

  it('fills the missing side from the ratio', () => {
    expect(resolveSize(src, { mode: 'px', width: 800, keepAspect: true })).toEqual({
      width: 800,
      height: 600,
    })
    expect(resolveSize(src, { mode: 'px', height: 300, keepAspect: false })).toEqual({
      width: 400,
      height: 300,
    })
  })

  it('fits inside the box when keeping aspect', () => {
    expect(resolveSize(src, { mode: 'px', width: 800, height: 800, keepAspect: true })).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('stretches when aspect is not kept', () => {
    expect(resolveSize(src, { mode: 'px', width: 800, height: 800, keepAspect: false })).toEqual({
      width: 800,
      height: 800,
    })
  })

  it('handles cm with dpi', () => {
    expect(
      resolveSize(src, { mode: 'cm', width: 3.5, height: 4.5, dpi: 300, keepAspect: false }),
    ).toEqual({ width: 413, height: 531 })
  })
})

describe('renameWithExt', () => {
  it('swaps the extension and adds a suffix', () => {
    expect(renameWithExt('photo.final.PNG', 'image/jpeg', '-small')).toBe('photo.final-small.jpg')
    expect(renameWithExt('noext', 'image/webp')).toBe('noext.webp')
  })
})

describe('searchQuality', () => {
  // fake encoder: size grows linearly with quality
  const encoder = (bytesAtFull: number) => async (q: number) =>
    new Blob([new Uint8Array(Math.round(bytesAtFull * q))])

  it('keeps top quality when it already fits', async () => {
    const r = await searchQuality(encoder(1000), 5000)
    expect(r.fits).toBe(true)
    expect(r.quality).toBe(0.95)
  })

  it('finds a quality under the limit', async () => {
    const r = await searchQuality(encoder(100_000), 40_000)
    expect(r.fits).toBe(true)
    expect(r.blob.size).toBeLessThanOrEqual(40_000)
    // should land reasonably close to the 0.4 boundary
    expect(r.quality).toBeGreaterThan(0.3)
  })

  it('reports when the target cannot be reached', async () => {
    const r = await searchQuality(encoder(100_000), 1_000)
    expect(r.fits).toBe(false)
    expect(r.quality).toBe(0.05)
  })
})
