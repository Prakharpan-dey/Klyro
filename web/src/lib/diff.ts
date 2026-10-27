/**
 * Line-by-line difference between two lists, by longest common subsequence.
 *
 * The textbook table is quadratic in time and space, which is nothing for a
 * page of text (a few hundred lines at most) but would not be for a whole book
 * compared as one list. So callers diff a page at a time, and past `LIMIT`
 * cells this gives up on alignment and reports the two sides as replaced
 * wholesale, which is still true, just less precise.
 */

export type DiffOp = { kind: 'same' | 'add' | 'remove'; text: string }

const LIMIT = 4_000_000

export function diffLines(before: string[], after: string[]): DiffOp[] {
  const n = before.length
  const m = after.length

  // common head and tail cost nothing to strip and usually cover most of a page
  let head = 0
  while (head < n && head < m && before[head] === after[head]) head++
  let tail = 0
  while (
    tail < n - head &&
    tail < m - head &&
    before[n - 1 - tail] === after[m - 1 - tail]
  ) {
    tail++
  }

  const a = before.slice(head, n - tail)
  const b = after.slice(head, m - tail)
  const middle: DiffOp[] = []

  if (a.length * b.length > LIMIT) {
    for (const text of a) middle.push({ kind: 'remove', text })
    for (const text of b) middle.push({ kind: 'add', text })
  } else {
    // lengths[i][j] = LCS of a[i..] and b[j..], stored flat
    const width = b.length + 1
    const lengths = new Uint32Array((a.length + 1) * width)
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        lengths[i * width + j] =
          a[i] === b[j]
            ? lengths[(i + 1) * width + j + 1] + 1
            : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1])
      }
    }

    let i = 0
    let j = 0
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        middle.push({ kind: 'same', text: a[i] })
        i++
        j++
      } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
        middle.push({ kind: 'remove', text: a[i++] })
      } else {
        middle.push({ kind: 'add', text: b[j++] })
      }
    }
    while (i < a.length) middle.push({ kind: 'remove', text: a[i++] })
    while (j < b.length) middle.push({ kind: 'add', text: b[j++] })
  }

  return [
    ...before.slice(0, head).map((text) => ({ kind: 'same' as const, text })),
    ...middle,
    ...before.slice(n - tail).map((text) => ({ kind: 'same' as const, text })),
  ]
}

/** Lines worth comparing: trimmed, whitespace collapsed, blanks dropped. */
export function comparableLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}
