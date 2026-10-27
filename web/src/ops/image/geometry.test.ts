import { describe, expect, it } from 'vitest'
import { anchorBox, aspectCrop, clampCrop, cropRect, planGeometry } from './geometry'

const photo = { width: 4000, height: 3000 }

describe('crop rectangle', () => {
  it('is the whole picture when nothing is cropped', () => {
    expect(cropRect(photo, undefined)).toEqual({ sx: 0, sy: 0, sw: 4000, sh: 3000 })
  })

  it('turns fractions into whole pixels', () => {
    expect(cropRect(photo, { x: 0.25, y: 0.5, w: 0.5, h: 0.25 })).toEqual({
      sx: 1000,
      sy: 1500,
      sw: 2000,
      sh: 750,
    })
  })

  it('never reaches past the edge, even when the fractions do', () => {
    const r = cropRect(photo, { x: 0.9, y: 0.9, w: 0.5, h: 0.5 })
    expect(r.sx + r.sw).toBe(4000)
    expect(r.sy + r.sh).toBe(3000)
  })

  it('keeps at least one pixel of a crop that rounds to nothing', () => {
    const r = cropRect({ width: 10, height: 10 }, { x: 0.5, y: 0.5, w: 0.001, h: 0.001 })
    expect(r.sw).toBe(1)
    expect(r.sh).toBe(1)
  })
})

describe('turning', () => {
  it('swaps width and height for a quarter turn either way', () => {
    for (const rotate of [90, 270] as const) {
      const g = planGeometry(photo, undefined, rotate)
      expect([g.width, g.height]).toEqual([3000, 4000])
    }
  })

  it('keeps the shape for a half turn', () => {
    const g = planGeometry(photo, undefined, 180)
    expect([g.width, g.height]).toEqual([4000, 3000])
  })

  it('crops before turning, so the turned size is the turned crop', () => {
    const g = planGeometry(photo, { x: 0, y: 0, w: 0.5, h: 1 }, 90)
    expect([g.sw, g.sh]).toEqual([2000, 3000])
    expect([g.width, g.height]).toEqual([3000, 2000])
  })
})

describe('fixed crop shapes', () => {
  it('makes a square from a landscape photo by trimming the sides', () => {
    const box = aspectCrop(photo, '1:1')
    expect(box.h).toBe(1)
    expect(box.w * photo.width).toBeCloseTo(box.h * photo.height)
    expect(box.x).toBeCloseTo((1 - box.w) / 2)
  })

  it('makes 16:9 from a 4:3 photo by trimming top and bottom', () => {
    const box = aspectCrop(photo, '16:9')
    expect(box.w).toBe(1)
    expect((box.w * photo.width) / (box.h * photo.height)).toBeCloseTo(16 / 9)
  })

  it('turns the shape upright when asked for portrait', () => {
    const box = aspectCrop(photo, '4:3', true)
    expect((box.w * photo.width) / (box.h * photo.height)).toBeCloseTo(3 / 4)
  })

  it('keeps a dragged box inside the picture', () => {
    expect(clampCrop({ x: 0.8, y: -0.2, w: 0.5, h: 0.5 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 })
  })
})

describe('watermark placement', () => {
  const canvas = { width: 1000, height: 500 }
  const text = { width: 200, height: 40 }

  it('puts a corner mark inside the margin', () => {
    expect(anchorBox(canvas, text, 'bottom-right', 20)).toEqual({ x: 780, y: 440 })
    expect(anchorBox(canvas, text, 'top-left', 20)).toEqual({ x: 20, y: 20 })
  })

  it('centres a centred mark', () => {
    expect(anchorBox(canvas, text, 'center', 20)).toEqual({ x: 400, y: 230 })
  })
})
