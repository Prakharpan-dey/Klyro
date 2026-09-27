import { describe, expect, it } from 'vitest'
import { PAGE_SEO, toolSeo } from './seo'
import { tools } from '@/tools/registry'

/**
 * Search results truncate, and a title written past the limit is silently cut
 * mid-word in the one place a stranger decides whether to click. These are the
 * lengths Google actually renders, checked at build time rather than trusted.
 */
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

describe('tool metadata for search', () => {
  it('gives every tool its own seo block', () => {
    const missing = tools.filter((t) => !t.seo).map((t) => t.slug)
    expect(missing).toEqual([])
  })

  it('keeps titles and descriptions inside what a result will show', () => {
    for (const tool of tools) {
      const { title, description } = toolSeo(tool)
      expect(
        title.length,
        `${tool.slug} title is ${title.length} chars: ${title}`,
      ).toBeLessThanOrEqual(TITLE_MAX)
      expect(
        description.length,
        `${tool.slug} description is ${description.length} chars`,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX)
      expect(description.length, `${tool.slug} description is too thin`).toBeGreaterThan(70)
    }
  })

  it('gives every tool a distinct title, so results are told apart', () => {
    const titles = tools.map((t) => toolSeo(t).title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('writes about copy long enough to be worth indexing', () => {
    for (const tool of tools) {
      const words = tool.seo?.about.split(/\s+/).length ?? 0
      expect(words, `${tool.slug} about is ${words} words`).toBeGreaterThan(35)
    }
  })

  it('holds the static pages to the same limits', () => {
    for (const [path, seo] of Object.entries(PAGE_SEO)) {
      expect(seo.title.length, `${path} title`).toBeLessThanOrEqual(TITLE_MAX)
      expect(seo.description.length, `${path} description`).toBeLessThanOrEqual(DESCRIPTION_MAX)
      expect(seo.path).toBe(path)
    }
  })
})
