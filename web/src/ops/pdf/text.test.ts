import { describe, expect, it } from 'vitest'
import { chunkText } from './text'

describe('chunkText', () => {
  const pageOne = 'First paragraph about marks.\n\nSecond paragraph about attendance.'
  const pageTwo = 'Third paragraph on the next page.'

  it('keeps everything in one chunk when it fits', () => {
    const chunks = chunkText([pageOne, pageTwo], 5000)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].pages).toEqual([1, 2])
    expect(chunks[0].text).toContain('Third paragraph')
  })

  it('splits on paragraph boundaries, never mid-sentence', () => {
    const chunks = chunkText([pageOne, pageTwo], 40)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.text.trim()).toBe(chunk.text)
      expect(chunk.text).not.toMatch(/^\s*$/)
    }
    // every paragraph survives somewhere
    const joined = chunks.map((c) => c.text).join('\n')
    expect(joined).toContain('attendance')
    expect(joined).toContain('Third paragraph')
  })

  it('records which pages each chunk came from', () => {
    const chunks = chunkText([pageOne, pageTwo], 40)
    expect(chunks.at(-1)?.pages).toContain(2)
  })

  it('ignores blank pages', () => {
    const chunks = chunkText(['', '   ', 'Real text'], 1000)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].pages).toEqual([3])
  })

  it('returns nothing for an empty document', () => {
    expect(chunkText(['', ''], 1000)).toEqual([])
  })
})
