import { describe, expect, it } from 'vitest'
import { estimateGifBytes, frameTimes, gifHeight, MAX_GIF_SECONDS } from './gif'

describe('frame timing', () => {
  it('takes one frame per tick across the range', () => {
    expect(frameTimes(2, 3, 4)).toEqual([2, 2.25, 2.5, 2.75])
  })

  it('stops at the cap however long the range is', () => {
    const times = frameTimes(0, 600, 10)
    expect(times).toHaveLength(MAX_GIF_SECONDS * 10)
    expect(times.at(-1)).toBeLessThan(MAX_GIF_SECONDS)
  })

  it('still makes one frame from a sliver of a clip', () => {
    expect(frameTimes(5, 5.01, 12)).toEqual([5])
  })

  it('does not lose the last frame to floating point', () => {
    // 0.1 * 30 is 3.0000000000000004 in floating point; that is still 30 frames
    expect(frameTimes(0, 3, 10)).toHaveLength(30)
  })
})

describe('output size', () => {
  it('keeps the clip shape', () => {
    expect(gifHeight(360, { width: 1920, height: 1080 })).toBe(203)
    expect(gifHeight(360, { width: 1080, height: 1920 })).toBe(640)
  })

  it('falls back to square before the clip has been measured', () => {
    expect(gifHeight(360, { width: 0, height: 0 })).toBe(360)
  })

  it('estimates in proportion to pixels and frames', () => {
    expect(estimateGifBytes(360, 200, 60)).toBe(2 * estimateGifBytes(360, 200, 30))
  })
})
