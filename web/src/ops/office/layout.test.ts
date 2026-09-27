import { PDFDocument, StandardFonts } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { LAYOUT_DEFAULTS, paragraphsToPdf, wrapText, type Paragraph } from './layout'
import { readDocxParagraphs } from './docxToPdf'

let font: Awaited<ReturnType<PDFDocument['embedFont']>>

beforeAll(async () => {
  const doc = await PDFDocument.create()
  font = await doc.embedFont(StandardFonts.Helvetica)
})

describe('word wrapping', () => {
  it('breaks on spaces and keeps every word', () => {
    const text = 'the quick brown fox jumps over the lazy dog'
    const lines = wrapText(text, font, 12, 90)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toBe(text)
    for (const line of lines) expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(90)
  })

  it('splits a word that cannot fit rather than letting it run off the page', () => {
    // a long URL is the real case: no space to break at, and overflowing the
    // margin would be silent
    const url = 'https://example.com/a/very/long/path/that/never/breaks/anywhere'
    const lines = wrapText(url, font, 12, 80)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe(url)
    for (const line of lines) expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(80)
  })

  it('returns nothing for empty text', () => {
    expect(wrapText('', font, 12, 100)).toEqual([])
    expect(wrapText('   ', font, 12, 100)).toEqual([])
  })
})

describe('paragraph layout', () => {
  const body = (text: string): Paragraph => ({ text, style: 'body' })

  it('flows long copy onto more than one page', async () => {
    const paragraphs = Array.from({ length: 120 }, (_, i) =>
      body(`Paragraph ${i + 1}. ${'Words enough to fill a line and then some. '.repeat(3)}`),
    )
    const out = await paragraphsToPdf(paragraphs, { name: 'long.docx', size: 1 }, LAYOUT_DEFAULTS)
    expect(out.pageCount).toBeGreaterThan(1)
    expect(out.file.name).toBe('long.pdf')

    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(out.pageCount)
  })

  it('starts a new page on an explicit break', async () => {
    const out = await paragraphsToPdf(
      [body('first'), { text: '', style: 'break' }, body('second')],
      { name: 'break.docx', size: 1 },
      LAYOUT_DEFAULTS,
    )
    expect(out.pageCount).toBe(2)
  })

  it('warns rather than failing when a glyph has no standard font', async () => {
    const out = await paragraphsToPdf(
      [body('Hello नमस्ते world')],
      { name: 'mixed.docx', size: 1 },
      LAYOUT_DEFAULTS,
    )
    expect(out.warning).toContain('Latin')
    expect(out.pageCount).toBe(1)
  })

  it('leaves no warning on plain Latin text', async () => {
    const out = await paragraphsToPdf(
      [body('Plain English, with “smart quotes” — and an ellipsis…')],
      { name: 'clean.docx', size: 1 },
      LAYOUT_DEFAULTS,
    )
    expect(out.warning).toBeUndefined()
  })
})

describe('reading a word document', () => {
  const doc = (inner: string) => `<w:document><w:body>${inner}</w:body></w:document>`

  it('picks up headings, body text and styling', () => {
    const paragraphs = readDocxParagraphs(
      doc(
        '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>' +
          '<w:p><w:r><w:t>Some body </w:t></w:r><w:r><w:t>text.</w:t></w:r></w:p>' +
          '<w:p><w:pPr><w:rPr><w:i/></w:rPr></w:pPr><w:r><w:t>Slanted</w:t></w:r></w:p>',
      ),
    )
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]).toMatchObject({ text: 'Title', style: 'h1' })
    expect(paragraphs[1]).toMatchObject({ text: 'Some body text.', style: 'body' })
    expect(paragraphs[2].italic).toBe(true)
  })

  it('marks list items and skips empty paragraphs', () => {
    const paragraphs = readDocxParagraphs(
      doc(
        '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>One</w:t></w:r></w:p>' +
          '<w:p></w:p>' +
          '<w:p><w:r><w:t>  </w:t></w:r></w:p>',
      ),
    )
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0].text).toBe('• One')
  })

  it('turns an explicit page break into a break paragraph', () => {
    const paragraphs = readDocxParagraphs(
      doc('<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:r><w:t>Next</w:t></w:r></w:p>'),
    )
    expect(paragraphs[0].style).toBe('break')
    expect(paragraphs[1].text).toBe('Next')
  })

  it('reads bold off the paragraph mark', () => {
    const paragraphs = readDocxParagraphs(
      doc('<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:t>Strong</w:t></w:r></w:p>'),
    )
    expect(paragraphs[0].bold).toBe(true)
  })

  it('ignores a bold flag that is switched off', () => {
    const paragraphs = readDocxParagraphs(
      doc('<w:p><w:pPr><w:rPr><w:b w:val="0"/></w:rPr></w:pPr><w:r><w:t>Plain</w:t></w:r></w:p>'),
    )
    expect(paragraphs[0].bold).toBe(false)
  })
})
