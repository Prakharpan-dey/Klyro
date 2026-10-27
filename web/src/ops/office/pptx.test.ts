import { describe, expect, it } from 'vitest'
import { elements } from './ooxml'
import {
  fitPicture,
  notesParagraphs,
  pptxParts,
  SLIDE_16_9,
  slideSizeFor,
  type Slide,
} from './pptx'

// a real 1x1 PNG, so the package is a valid deck and not just valid XML
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

const slide = (over: Partial<Slide> = {}): Slide => ({
  image: PNG,
  kind: 'png',
  width: 800,
  height: 600,
  ...over,
})

/** Resolves a relationship target against the folder of the part that owns it. */
function resolve(relsPath: string, target: string): string {
  const owner = relsPath.replace('/_rels/', '/').replace(/\.rels$/, '')
  const base = owner.includes('/') ? owner.slice(0, owner.lastIndexOf('/') + 1) : ''
  const parts: string[] = []
  for (const segment of `${relsPath.startsWith('_rels/') ? '' : base}${target}`.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment && segment !== '.') parts.push(segment)
  }
  return parts.join('/')
}

/**
 * The checks PowerPoint performs before it offers to "repair" a file: every
 * relationship points at a part that exists, and every part has a content type.
 */
function assertPackageIsWhole(parts: Record<string, string | Uint8Array>) {
  const names = new Set(Object.keys(parts))
  const types = parts['[Content_Types].xml'] as string
  const overrides = new Set(elements(types, 'Override').map((o) => o.attrs.PartName.slice(1)))
  const defaults = new Set(elements(types, 'Default').map((d) => d.attrs.Extension))

  for (const name of names) {
    if (name === '[Content_Types].xml') continue
    const extension = name.split('.').pop()!
    expect(
      overrides.has(name) || defaults.has(extension),
      `${name} has no content type`,
    ).toBe(true)
  }
  for (const override of overrides) {
    expect(names.has(override), `content type declared for missing part ${override}`).toBe(true)
  }

  for (const [name, body] of Object.entries(parts)) {
    if (!name.endsWith('.rels')) continue
    for (const rel of elements(body as string, 'Relationship')) {
      const target = resolve(name, rel.attrs.Target)
      expect(names.has(target), `${name} points at missing ${target}`).toBe(true)
    }
  }
}

describe('slide geometry', () => {
  it('keeps a widescreen page widescreen', () => {
    expect(slideSizeFor(1600, 900)).toEqual(SLIDE_16_9)
  })

  it('makes an A4 page into a portrait slide, not a strip in a 16:9 one', () => {
    const size = slideSizeFor(595, 842)
    expect(size.cy).toBeGreaterThan(size.cx)
    expect(size.cy).toBe(SLIDE_16_9.cx)
  })

  it('centres a picture without stretching it', () => {
    const box = fitPicture({ width: 1000, height: 1000 }, SLIDE_16_9)
    expect(box.cx).toBe(box.cy)
    expect(box.cy).toBe(SLIDE_16_9.cy)
    expect(box.x).toBe((SLIDE_16_9.cx - box.cx) / 2)
    expect(box.y).toBe(0)
  })
})

describe('speaker notes', () => {
  it('writes one paragraph per line and escapes markup', () => {
    const xml = notesParagraphs('First <line>\nSecond & last')
    expect(elements(xml, 'a:p')).toHaveLength(2)
    expect(xml).toContain('First &lt;line&gt;')
    expect(xml).toContain('Second &amp; last')
  })

  it('still writes a paragraph when there is no text', () => {
    expect(notesParagraphs('')).toBe('<a:p><a:endParaRPr lang="en-US"/></a:p>')
  })
})

describe('the package', () => {
  it('is whole with speaker notes', () => {
    const parts = pptxParts([slide({ notes: 'one' }), slide({ notes: 'two', kind: 'jpg' })], SLIDE_16_9)
    assertPackageIsWhole(parts)
    expect(parts['ppt/notesMasters/notesMaster1.xml']).toBeDefined()
    expect(parts['ppt/media/image2.jpeg']).toBeDefined()
  })

  it('is whole without any notes, and carries no notes master', () => {
    const parts = pptxParts([slide(), slide()], SLIDE_16_9)
    assertPackageIsWhole(parts)
    expect(parts['ppt/notesMasters/notesMaster1.xml']).toBeUndefined()
    expect(parts['ppt/presentation.xml']).not.toContain('notesMasterIdLst')
  })

  it('lists every slide in order, with ids PowerPoint accepts', () => {
    const parts = pptxParts([slide(), slide(), slide()], SLIDE_16_9)
    const ids = elements(parts['ppt/presentation.xml'] as string, 'p:sldId').map((s) =>
      Number(s.attrs.id),
    )
    expect(ids).toEqual([256, 257, 258])
  })

  it('writes presentation.xml children in schema order', () => {
    const xml = pptxParts([slide({ notes: 'x' })], SLIDE_16_9)['ppt/presentation.xml'] as string
    const order = ['sldMasterIdLst', 'notesMasterIdLst', 'sldIdLst', 'sldSz', 'notesSz'].map(
      (tag) => xml.indexOf(`<p:${tag}`),
    )
    expect(order.every((at) => at > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('refuses an empty deck', () => {
    expect(() => pptxParts([], SLIDE_16_9)).toThrow()
  })
})
