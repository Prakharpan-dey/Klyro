import { describe, expect, it } from 'vitest'
import { categoryLabel, tools, toolGroups } from './registry'

/**
 * The index is built from a fixed list of group names. A tool whose group is
 * missing from that list still exists, still has a page, and simply never
 * appears anywhere anyone can click — which is the kind of thing you discover
 * on stage rather than in a diff.
 */

describe('tool registry', () => {
  it('shows every tool somewhere in the index', () => {
    const shown = new Set(toolGroups.flatMap((section) => section.tools.map((t) => t.slug)))
    const missing = tools.filter((tool) => !shown.has(tool.slug)).map((tool) => tool.slug)
    expect(missing).toEqual([])
  })

  it('has a label for every category', () => {
    for (const tool of tools) expect(categoryLabel[tool.category]).toBeTruthy()
  })

  it('gives every tool its own code', () => {
    const codes = tools.map((tool) => tool.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('gives every tool something to accept and something to say', () => {
    for (const tool of tools) {
      expect(tool.accept.length, `${tool.slug} accepts nothing`).toBeGreaterThan(0)
      expect(tool.summary.length, `${tool.slug} has no summary`).toBeGreaterThan(10)
    }
  })
})
