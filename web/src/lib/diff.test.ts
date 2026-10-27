import { describe, expect, it } from 'vitest'
import { comparableLines, diffLines } from './diff'

const changes = (ops: ReturnType<typeof diffLines>) =>
  ops.filter((op) => op.kind !== 'same').map((op) => `${op.kind === 'add' ? '+' : '-'}${op.text}`)

describe('line diff', () => {
  it('finds nothing between identical lists', () => {
    expect(changes(diffLines(['a', 'b', 'c'], ['a', 'b', 'c']))).toEqual([])
  })

  it('reports a changed line as one removal and one addition', () => {
    expect(changes(diffLines(['a', 'b', 'c'], ['a', 'B', 'c']))).toEqual(['-b', '+B'])
  })

  it('reports an inserted line without disturbing the rest', () => {
    expect(changes(diffLines(['a', 'c'], ['a', 'b', 'c']))).toEqual(['+b'])
  })

  it('reports a deleted line without disturbing the rest', () => {
    expect(changes(diffLines(['a', 'b', 'c'], ['a', 'c']))).toEqual(['-b'])
  })

  it('handles one side being empty', () => {
    expect(changes(diffLines([], ['x', 'y']))).toEqual(['+x', '+y'])
    expect(changes(diffLines(['x'], []))).toEqual(['-x'])
  })

  it('keeps every line of both sides, in order', () => {
    const before = ['the', 'quick', 'brown', 'fox', 'jumps']
    const after = ['the', 'slow', 'brown', 'dog', 'jumps', 'high']
    const ops = diffLines(before, after)
    expect(ops.filter((o) => o.kind !== 'add').map((o) => o.text)).toEqual(before)
    expect(ops.filter((o) => o.kind !== 'remove').map((o) => o.text)).toEqual(after)
  })

  it('still answers, less precisely, on inputs too big to align', () => {
    const big = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const other = Array.from({ length: 3000 }, (_, i) => `other ${i}`)
    const ops = diffLines(big, other)
    expect(ops.filter((o) => o.kind === 'remove')).toHaveLength(3000)
    expect(ops.filter((o) => o.kind === 'add')).toHaveLength(3000)
  })
})

describe('comparable lines', () => {
  it('ignores spacing differences and blank lines', () => {
    expect(comparableLines('  Clause 4:   pay\n\n  within 30 days ')).toEqual([
      'Clause 4: pay',
      'within 30 days',
    ])
  })
})
