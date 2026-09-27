import type { OutputFile, Progress } from '../types'
import { EmptyDocumentError } from './docxToPdf'
import { htmlToParagraphs } from './html'
import { paragraphsToPdf, type LayoutParams, type Paragraph } from './layout'
import { elements, unzipParts } from './ooxml'

/**
 * Reads an EPUB in reading order and lays it out as one PDF.
 *
 * An EPUB is a zip of XHTML chapters, and the order they belong in is not the
 * order the zip stores them. `META-INF/container.xml` points at a package file,
 * whose manifest maps ids to files and whose spine lists those ids in reading
 * order. Following that chain is the whole job; the chapters themselves are
 * HTML, which `htmlToParagraphs` already handles.
 */

const READABLE = /\.(xml|opf|ncx|x?html?)$/i

/** Resolves an href inside the package against the package's own folder. */
export function resolveHref(packagePath: string, href: string): string {
  const base = packagePath.includes('/') ? packagePath.replace(/\/[^/]*$/, '/') : ''
  const joined = `${base}${href}`.replace(/\/\.\//g, '/')

  // collapse any ../ the package uses to climb out of its folder
  const parts: string[] = []
  for (const segment of joined.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment && segment !== '.') parts.push(segment)
  }
  return parts.join('/')
}

/** Chapter paths, in reading order. */
export function spineOrder(packagePath: string, packageXml: string): string[] {
  const manifest = new Map<string, string>()
  for (const item of elements(packageXml, 'item')) {
    const id = item.attrs.id
    const href = item.attrs.href
    if (id && href) manifest.set(id, resolveHref(packagePath, decodeURIComponent(href)))
  }

  const order: string[] = []
  for (const ref of elements(packageXml, 'itemref')) {
    const path = manifest.get(ref.attrs.idref ?? '')
    // the spine also lists the cover and the nav document; only markup is read
    if (path && /\.x?html?$/i.test(path)) order.push(path)
  }

  return order
}

export async function epubToPdf(
  file: File,
  params: LayoutParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Opening the book')
  const parts = await unzipParts(file, READABLE)

  const container = parts.get('META-INF/container.xml') ?? ''
  const packagePath =
    elements(container, 'rootfile')[0]?.attrs['full-path'] ??
    [...parts.keys()].find((name) => name.endsWith('.opf'))

  if (!packagePath) throw new EmptyDocumentError('EPUB')
  const chapters = spineOrder(packagePath, parts.get(packagePath) ?? '')
  if (!chapters.length) throw new EmptyDocumentError('EPUB')

  const paragraphs: Paragraph[] = []
  chapters.forEach((path, index) => {
    onProgress?.(index, chapters.length, `Chapter ${index + 1} of ${chapters.length}`)
    const html = parts.get(path)
    if (!html) return

    const chapter = htmlToParagraphs(html)
    if (!chapter.length) return
    // each chapter starts its own page, the way the book reads
    if (paragraphs.length) paragraphs.push({ text: '', style: 'break' })
    paragraphs.push(...chapter)
  })

  if (!paragraphs.length) throw new EmptyDocumentError('EPUB')
  return paragraphsToPdf(paragraphs, file, params, onProgress)
}
