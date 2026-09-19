import { describe, expect, it } from 'vitest'
import { probeFormats } from './support'

/**
 * The reason this probe exists at all: a browser that cannot write a format
 * hands back a PNG instead of failing, so only the returned type can be
 * trusted. These tests hold that line with a fake encoder.
 */

function encoder(writable: string[]) {
  return async (type: string) =>
    // stand in for a browser: it always returns something, just not always what was asked for
    new Blob(['x'], { type: writable.includes(type) ? type : 'image/png' })
}

describe('probeFormats', () => {
  it('accepts only formats that come back as themselves', async () => {
    const found = await probeFormats(encoder(['image/jpeg', 'image/png', 'image/webp']))
    expect([...found].sort()).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(found.has('image/avif')).toBe(false)
  })

  it('finds AVIF where it is genuinely written', async () => {
    const found = await probeFormats(
      encoder(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    )
    expect(found.has('image/avif')).toBe(true)
  })

  it('keeps PNG even when the probe returns nothing at all', async () => {
    const found = await probeFormats(async () => null)
    expect([...found]).toEqual(['image/png'])
  })
})
