import { describe, expect, it } from 'vitest'
import { resolveHref, spineOrder } from './epub'
import { decodeHtml, htmlToParagraphs, htmlTitle } from './html'
import { readOdsSheets, readOdtParagraphs } from './odf'
import { rtfToParagraphs } from './rtf'
import { naturalOrder } from '../pdf/fromZip'

/**
 * Each reader turns one container format into paragraphs or sheets. What is
 * worth checking is the part that is easy to get quietly wrong: order, and
 * whether anything is dropped or printed twice.
 */

describe('opendocument text', () => {
  const body = (inner: string) => `<office:text>${inner}</office:text>`

  it('keeps headings and paragraphs in document order', () => {
    const paragraphs = readOdtParagraphs(
      body(
        '<text:h text:outline-level="1">Title</text:h>' +
          '<text:p>First.</text:p>' +
          '<text:h text:outline-level="2">Part two</text:h>' +
          '<text:p>Second.</text:p>',
      ),
    )
    expect(paragraphs.map((p) => [p.style, p.text])).toEqual([
      ['h1', 'Title'],
      ['body', 'First.'],
      ['h2', 'Part two'],
      ['body', 'Second.'],
    ])
  })

  it('reads text that is split across spans', () => {
    const paragraphs = readOdtParagraphs(
      body('<text:p>One <text:span>two</text:span> three</text:p>'),
    )
    expect(paragraphs[0].text).toBe('One two three')
  })

  it('turns space and tab elements into characters', () => {
    const paragraphs = readOdtParagraphs(body('<text:p>a<text:s/>b<text:tab/>c</text:p>'))
    expect(paragraphs[0].text).toBe('a b c')
  })

  it('prints a list item once, not once per nested paragraph', () => {
    const paragraphs = readOdtParagraphs(
      body('<text:list><text:list-item><text:p>Only once</text:p></text:list-item></text:list>'),
    )
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0].text).toBe('• Only once')
  })

  it('skips empty paragraphs', () => {
    expect(readOdtParagraphs(body('<text:p></text:p><text:p>  </text:p>'))).toEqual([])
  })
})

describe('opendocument spreadsheets', () => {
  const sheet = (rows: string) =>
    `<table:table table:name="Marks"><table:table-row>${rows}</table:table-row></table:table>`

  it('reads numbers as numbers and text as text', () => {
    const [table] = readOdsSheets(
      sheet(
        '<table:table-cell office:value-type="string"><text:p>Asha</text:p></table:table-cell>' +
          '<table:table-cell office:value-type="float" office:value="92.5"><text:p>92.5</text:p></table:table-cell>',
      ),
    )
    expect(table.name).toBe('Marks')
    expect(table.rows[0]).toEqual(['Asha', 92.5])
  })

  it('expands a repeated cell', () => {
    const [table] = readOdsSheets(
      sheet(
        '<table:table-cell office:value-type="float" office:value="1" table:number-columns-repeated="3"><text:p>1</text:p></table:table-cell>',
      ),
    )
    expect(table.rows[0]).toEqual([1, 1, 1])
  })

  it('does not expand the thousand empty cells ODF pads rows with', () => {
    const [table] = readOdsSheets(
      sheet(
        '<table:table-cell office:value-type="string"><text:p>A</text:p></table:table-cell>' +
          '<table:table-cell table:number-columns-repeated="1024"/>',
      ),
    )
    expect(table.rows[0]).toEqual(['A'])
  })
})

describe('html', () => {
  it('maps block elements to styles', () => {
    const paragraphs = htmlToParagraphs(
      '<h1>Title</h1><p>Body text.</p><h3>Sub</h3><blockquote>Quoted</blockquote>',
    )
    expect(paragraphs.map((p) => p.style)).toEqual(['h1', 'body', 'h3', 'quote'])
  })

  it('bullets list items and does not repeat a nested paragraph', () => {
    const paragraphs = htmlToParagraphs('<ul><li><p>One</p></li><li>Two</li></ul>')
    expect(paragraphs.map((p) => p.text)).toEqual(['• One', '• Two'])
  })

  it('throws away scripts, styles and comments rather than printing them', () => {
    const paragraphs = htmlToParagraphs(
      '<style>p{color:red}</style><script>alert(1)</script><!-- hidden --><p>Kept</p>',
    )
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0].text).toBe('Kept')
  })

  it('collapses whitespace outside preformatted blocks', () => {
    expect(htmlToParagraphs('<p>a\n\n   b</p>')[0].text).toBe('a b')
  })

  it('decodes the entities a real page uses', () => {
    expect(decodeHtml('R&amp;D &mdash; caf&eacute;&nbsp;open &#8212; 5&deg;')).toBe(
      'R&D — café open — 5°',
    )
  })

  it('reads the document title', () => {
    expect(htmlTitle('<html><head><title>  My page </title></head></html>')).toBe('My page')
  })
})

describe('rtf', () => {
  it('splits paragraphs on \\par', () => {
    const paragraphs = rtfToParagraphs('{\\rtf1 First line.\\par Second line.\\par}')
    expect(paragraphs.map((p) => p.text)).toEqual(['First line.', 'Second line.'])
  })

  it('tracks bold and italic, and switches them back off', () => {
    const paragraphs = rtfToParagraphs('{\\rtf1 \\b Bold.\\par \\b0 Plain.\\par}')
    expect(paragraphs[0].bold).toBe(true)
    expect(paragraphs[1].bold).toBe(false)
  })

  it('decodes escaped characters and unicode', () => {
    const [para] = rtfToParagraphs("{\\rtf1 100\\'25 caf\\u233  done\\par}")
    expect(para.text).toBe('100% café done')
  })

  it('skips the font and colour tables instead of printing them', () => {
    const paragraphs = rtfToParagraphs(
      '{\\rtf1{\\fonttbl{\\f0 Times New Roman;}}{\\colortbl;\\red0\\green0\\blue0;}Real text.\\par}',
    )
    expect(paragraphs.map((p) => p.text)).toEqual(['Real text.'])
  })

  it('keeps an escaped brace as a brace', () => {
    expect(rtfToParagraphs('{\\rtf1 a \\{b\\} c\\par}')[0].text).toBe('a {b} c')
  })

  it('turns a page break into its own paragraph', () => {
    const paragraphs = rtfToParagraphs('{\\rtf1 One\\page Two\\par}')
    expect(paragraphs.map((p) => p.style)).toEqual(['body', 'break', 'body'])
  })
})

describe('epub', () => {
  it('resolves chapter paths against the package folder', () => {
    expect(resolveHref('OEBPS/content.opf', 'ch1.xhtml')).toBe('OEBPS/ch1.xhtml')
    expect(resolveHref('OEBPS/content.opf', 'text/ch1.xhtml')).toBe('OEBPS/text/ch1.xhtml')
    expect(resolveHref('OEBPS/pkg/content.opf', '../ch1.xhtml')).toBe('OEBPS/ch1.xhtml')
    expect(resolveHref('content.opf', 'ch1.xhtml')).toBe('ch1.xhtml')
  })

  it('follows the spine rather than the order the manifest lists', () => {
    const packageXml =
      '<package><manifest>' +
      '<item id="c2" href="two.xhtml"/><item id="c1" href="one.xhtml"/>' +
      '<item id="css" href="style.css"/>' +
      '</manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'

    expect(spineOrder('OEBPS/content.opf', packageXml)).toEqual([
      'OEBPS/one.xhtml',
      'OEBPS/two.xhtml',
    ])
  })
})

describe('archive ordering', () => {
  it('reads page numbers as numbers', () => {
    const names = ['page10.jpg', 'page2.jpg', 'Page1.jpg']
    expect([...names].sort(naturalOrder)).toEqual(['Page1.jpg', 'page2.jpg', 'page10.jpg'])
  })
})
