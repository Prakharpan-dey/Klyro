export interface RangeParse {
  /** one entry per comma-separated segment, each a list of 0-based page indices */
  groups: number[][]
  error?: string
}

/**
 * Parses user page input like "1-3, 5, 8-" against a document with `pageCount` pages.
 * Pages are 1-based in the input and 0-based in the output. "8-" means 8 to the end,
 * "-3" means 1 to 3, and a reversed range such as "5-2" is kept in that order.
 */
export function parsePageRanges(input: string, pageCount: number): RangeParse {
  const groups: number[][] = []
  const segments = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!segments.length) return { groups, error: 'Enter at least one page or range' }

  for (const seg of segments) {
    const match = /^(\d*)\s*-\s*(\d*)$/.exec(seg)
    let start: number
    let end: number

    if (/^\d+$/.test(seg)) {
      start = end = Number(seg)
    } else if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : 1
      end = match[2] ? Number(match[2]) : pageCount
    } else {
      return { groups, error: `"${seg}" is not a page or range` }
    }

    if (start < 1 || end < 1) return { groups, error: 'Pages start at 1' }
    if (start > pageCount || end > pageCount) {
      return {
        groups,
        error: `Page ${Math.max(start, end)} is past the end (${pageCount} pages)`,
      }
    }

    const step = start <= end ? 1 : -1
    const pages: number[] = []
    for (let p = start; p !== end + step; p += step) pages.push(p - 1)
    groups.push(pages)
  }

  return { groups }
}

/** Flattens ranges into a sorted list of unique 0-based page indices. */
export function parsePageList(
  input: string,
  pageCount: number,
): { pages: number[]; error?: string } {
  const { groups, error } = parsePageRanges(input, pageCount)
  if (error) return { pages: [], error }
  return { pages: [...new Set(groups.flat())].sort((a, b) => a - b) }
}

/** Groups of `size` consecutive pages: 0-1, 2-3, ... */
export function chunkPages(pageCount: number, size: number): number[][] {
  const out: number[][] = []
  for (let i = 0; i < pageCount; i += size) {
    out.push(Array.from({ length: Math.min(size, pageCount - i) }, (_, k) => i + k))
  }
  return out
}

/** Compact label for a list of 0-based indices, e.g. [0,1,2,4] → "1-3, 5". */
export function formatPageList(pages: number[]): string {
  const parts: string[] = []
  let i = 0
  while (i < pages.length) {
    let j = i
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++
    parts.push(i === j ? `${pages[i] + 1}` : `${pages[i] + 1}-${pages[j] + 1}`)
    i = j + 1
  }
  return parts.join(', ')
}
