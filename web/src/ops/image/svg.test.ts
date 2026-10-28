import { describe, expect, it } from 'vitest'
import { DEFAULT_SVG_SIZE, svgLength, svgOutputSize, svgSize, SvgError } from './svg'

const svg = (attrs: string) =>
  `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect/></svg>`

describe('svgLength', () => {
  it('reads pixels with or without the unit', () => {
    expect(svgLength('120')).toBe(120)
    expect(svgLength('120px')).toBe(120)
  })

  it('converts print units the way a browser does', () => {
    expect(svgLength('1in')).toBe(96)
    expect(svgLength('72pt')).toBe(96)
    expect(svgLength('25.4mm')).toBeCloseTo(96)
  })

  it('has no absolute answer for a percentage or an em', () => {
    expect(svgLength('100%')).toBeUndefined()
    expect(svgLength('2em')).toBeUndefined()
    expect(svgLength('auto')).toBeUndefined()
  })
})

describe('svgSize', () => {
  it('uses width and height when both are given', () => {
    expect(svgSize(svg('width="64" height="32" viewBox="0 0 10 10"'))).toEqual({
      width: 64,
      height: 32,
    })
  })

  it('takes the size of the viewBox when that is all there is', () => {
    expect(svgSize(svg('viewBox="0 0 24 24"'))).toEqual({ width: 24, height: 24 })
  })

  it('fills in the missing side from the viewBox shape', () => {
    expect(svgSize(svg('width="200" viewBox="0 0 100 50"'))).toEqual({ width: 200, height: 100 })
  })

  it('treats a percentage as missing', () => {
    expect(svgSize(svg('width="100%" height="100%" viewBox="0,0,40,30"'))).toEqual({
      width: 40,
      height: 30,
    })
  })

  it('reads attributes in either quote style and across lines', () => {
    expect(svgSize(`<svg\n  width='10mm'\n  height='5mm'>`).width).toBeCloseTo(37.8, 1)
  })

  it('falls back to the browser default with nothing to go on', () => {
    expect(svgSize(svg(''))).toEqual(DEFAULT_SVG_SIZE)
  })

  it('refuses a file that is not an SVG', () => {
    expect(() => svgSize('<html></html>')).toThrow(SvgError)
  })
})

describe('svgOutputSize', () => {
  it('scales both sides', () => {
    expect(svgOutputSize({ width: 24, height: 24 }, { mode: 'scale', scale: 4 })).toEqual({
      width: 96,
      height: 96,
    })
  })

  it('keeps the shape when a width is asked for', () => {
    expect(svgOutputSize({ width: 300, height: 150 }, { mode: 'width', width: 1000 })).toEqual({
      width: 1000,
      height: 500,
    })
  })

  it('refuses a canvas bigger than a browser can hold', () => {
    expect(() => svgOutputSize({ width: 5000, height: 5000 }, { mode: 'scale', scale: 4 })).toThrow(
      SvgError,
    )
  })
})
