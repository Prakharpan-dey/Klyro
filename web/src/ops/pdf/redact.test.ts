import { describe, expect, it } from 'vitest'
import { boxesForTerm, fractionToBox, pagesTouched, type RedactBox } from './redact'
import type { TextPiece } from './text'

/**
 * The canvas half of redaction cannot run here — the suite is node, with no
 * document and no 2d context — so what is checked is the geometry that decides
 * where the black goes. A box that is off by a few points is the failure that
 * matters: it leaves part of a name showing while the tool reports success.
 */

const piece = (over: Partial<TextPiece> = {}): TextPiece => ({
  str: 'Account 4111 1111 1111 1111 held by Priya',
  x: 72,
  y: 500,
  width: 200,
  height: 10,
  ...over,
})

describe('finding a term in a run of text', () => {
  it('covers the term and nothing like the whole line', () => {
    const [box] = boxesForTerm(piece(), 'Priya', 2)
    expect(box.page).toBe(2)
    expect(box.width).toBeLessThan(200)
    expect(box.x).toBeGreaterThan(72)
  })

  it('finds every occurrence, not just the first', () => {
    const boxes = boxesForTerm(piece({ str: 'ann and ann and ann' }), 'ann', 0)
    expect(boxes).toHaveLength(3)
    // left to right, each one further along the line
    expect(boxes[0].x).toBeLessThan(boxes[1].x)
    expect(boxes[1].x).toBeLessThan(boxes[2].x)
  })

  it('ignores case', () => {
    expect(boxesForTerm(piece({ str: 'PRIYA' }), 'priya', 0)).toHaveLength(1)
    expect(boxesForTerm(piece({ str: 'priya' }), 'PRIYA', 0)).toHaveLength(1)
  })

  it('returns nothing for an empty term, rather than a box over everything', () => {
    expect(boxesForTerm(piece(), '', 0)).toEqual([])
  })

  it('covers more than the glyphs, never less', () => {
    const run = piece({ str: 'Priya', x: 100, y: 200, width: 40, height: 10 })
    const [box] = boxesForTerm(run, 'Priya', 0)
    expect(box.x).toBeLessThanOrEqual(run.x)
    expect(box.x + box.width).toBeGreaterThanOrEqual(run.x + run.width)
    // and it reaches below the baseline, where descenders live
    expect(box.y).toBeLessThan(run.y)
    expect(box.y + box.height).toBeGreaterThan(run.y + run.height)
  })

  it('does not match across a gap that is not there', () => {
    expect(boxesForTerm(piece({ str: 'Priyanka' }), 'Priya', 0)).toHaveLength(1)
    expect(boxesForTerm(piece({ str: 'Pri ya' }), 'Priya', 0)).toEqual([])
  })
})

describe('a box drawn on the preview', () => {
  const size = { width: 600, height: 800 }

  it('flips the origin from the top-left to the bottom-left', () => {
    // top quarter of the page on screen
    const box = fractionToBox({ page: 0, x: 0, y: 0, w: 1, h: 0.25 }, size)
    expect(box.x).toBe(0)
    expect(box.width).toBe(600)
    expect(box.height).toBe(200)
    // in PDF coordinates the top quarter starts 600pt up from the bottom
    expect(box.y).toBe(600)
  })

  it('keeps a box in the middle in the middle', () => {
    const box = fractionToBox({ page: 1, x: 0.25, y: 0.375, w: 0.5, h: 0.25 }, size)
    expect(box).toEqual({ page: 1, x: 150, y: 300, width: 300, height: 200 })
  })

  it('puts a full-page box over the whole page', () => {
    const box = fractionToBox({ page: 0, x: 0, y: 0, w: 1, h: 1 }, size)
    expect(box).toEqual({ page: 0, x: 0, y: 0, width: 600, height: 800 })
  })
})

describe('deciding which pages to rebuild', () => {
  it('names each page once, however many boxes it carries', () => {
    const boxes: RedactBox[] = [
      { page: 0, x: 0, y: 0, width: 1, height: 1 },
      { page: 0, x: 5, y: 5, width: 1, height: 1 },
      { page: 3, x: 0, y: 0, width: 1, height: 1 },
    ]
    expect([...pagesTouched(boxes)].sort()).toEqual([0, 3])
  })

  it('rebuilds nothing when nothing was marked', () => {
    expect(pagesTouched([]).size).toBe(0)
  })
})
