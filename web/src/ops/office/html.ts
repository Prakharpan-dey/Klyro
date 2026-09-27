import { unescapeXml } from './ooxml'
import type { Paragraph } from './layout'

/**
 * Turns markup into paragraphs.
 *
 * Deliberately a scanner rather than `DOMParser`: the same code then runs in a
 * worker and under the test suite, which has no document. It also cannot be
 * made to fetch anything, which matters for a tool whose whole claim is that
 * the file stays on the machine — handing untrusted markup to the browser's
 * parser invites it to resolve images and stylesheets over the network.
 *
 * Block elements become paragraphs, everything else is discarded. That is the
 * honest limit of converting a page to a PDF without a layout engine.
 */

/** Named entities beyond the five XML ones that turn up constantly in HTML. */
const NAMED: Record<string, string> = {
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  eacute: 'é',
  egrave: 'è',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  ccedil: 'ç',
  pound: '£',
  euro: '€',
  middot: '·',
  bull: '•',
  times: '×',
}

export function decodeHtml(text: string): string {
  return unescapeXml(text).replace(/&([a-zA-Z]+);/g, (whole, name: string) => NAMED[name] ?? whole)
}

const BLOCK = 'h1|h2|h3|h4|h5|h6|p|li|blockquote|pre|figcaption|dt|dd|td|th'

function styleFor(tag: string): Paragraph['style'] {
  if (tag === 'h1') return 'h1'
  if (tag === 'h2') return 'h2'
  if (/^h[3-6]$/.test(tag)) return 'h3'
  if (tag === 'blockquote') return 'quote'
  if (tag === 'pre') return 'code'
  return 'body'
}

/** Whitespace collapses in HTML; a preformatted block is the one place it does not. */
function clean(text: string, keepSpacing: boolean): string {
  // tags first, entities second: decoding first would turn a written-out
  // `&lt;b&gt;` into something the tag stripper then eats
  const words = text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')
  const decoded = decodeHtml(words)
  return keepSpacing ? decoded.trim() : decoded.replace(/\s+/g, ' ').trim()
}

export function htmlToParagraphs(html: string): Paragraph[] {
  // scripts, styles and comments carry no reading matter, and their contents
  // would otherwise be stripped of tags and printed as text
  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')

  const out: Paragraph[] = []
  const open = new RegExp(`<(${BLOCK})(\\s[^>]*)?>`, 'gi')
  let match: RegExpExecArray | null

  while ((match = open.exec(body))) {
    const tag = match[1].toLowerCase()
    const from = match.index + match[0].length
    const close = body.toLowerCase().indexOf(`</${tag}>`, from)
    const to = close === -1 ? body.length : close

    const inner = body.slice(from, to)
    // A list item or a quote keeps its own styling even when the text sits in a
    // paragraph inside it, so the whole element is taken and the scan resumes
    // past it. Everywhere else a nested block is left to be reached on its own,
    // and only the text before it is taken, or it would print twice.
    const whole = tag === 'li' || tag === 'blockquote' || tag === 'pre'
    if (whole) open.lastIndex = to

    const nested = whole ? null : new RegExp(`<(${BLOCK})(\\s[^>]*)?>`, 'i').exec(inner)
    const text = clean(nested ? inner.slice(0, nested.index) : inner, tag === 'pre')
    if (!text) continue

    out.push({
      text: tag === 'li' ? `• ${text}` : text,
      style: styleFor(tag),
    })
  }

  return out
}

/** The document title, used to name the PDF when the file itself is unnamed. */
export function htmlTitle(html: string): string | undefined {
  return decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}
