import { describe, expect, it } from 'vitest'
import { chunkPages, formatPageList, parsePageList, parsePageRanges } from './pageRange'

describe('parsePageRanges', () => {
  it('parses single pages and ranges into 0-based groups', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual({ groups: [[0, 1, 2], [4]] })
  })

  it('supports open ranges', () => {
    expect(parsePageRanges('8-', 10).groups).toEqual([[7, 8, 9]])
    expect(parsePageRanges('-2', 10).groups).toEqual([[0, 1]])
  })

  it('keeps reversed ranges in reverse order', () => {
    expect(parsePageRanges('4-2', 5).groups).toEqual([[3, 2, 1]])
  })

  it('tolerates extra spaces and empty segments', () => {
    expect(parsePageRanges(' 2 - 3 ,, 1 ', 5).groups).toEqual([[1, 2], [0]])
  })

  it('rejects empty input', () => {
    expect(parsePageRanges('  ', 5).error).toBeDefined()
  })

  it('rejects garbage', () => {
    expect(parsePageRanges('1-2-3', 5).error).toMatch(/not a page/)
    expect(parsePageRanges('abc', 5).error).toMatch(/not a page/)
    expect(parsePageRanges('-', 5).error).toMatch(/not a page/)
  })

  it('rejects pages out of bounds', () => {
    expect(parsePageRanges('0', 5).error).toMatch(/start at 1/)
    expect(parsePageRanges('3-9', 5).error).toMatch(/past the end/)
  })
})

describe('parsePageList', () => {
  it('dedupes and sorts', () => {
    expect(parsePageList('5, 1-3, 2', 6).pages).toEqual([0, 1, 2, 4])
  })
})

describe('chunkPages', () => {
  it('splits into fixed-size groups with a short tail', () => {
    expect(chunkPages(5, 2)).toEqual([[0, 1], [2, 3], [4]])
  })
})

describe('formatPageList', () => {
  it('collapses consecutive pages', () => {
    expect(formatPageList([0, 1, 2, 4, 6, 7])).toBe('1-3, 5, 7-8')
    expect(formatPageList([])).toBe('')
  })
})
