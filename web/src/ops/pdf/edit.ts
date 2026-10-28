import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { embedFont, placeImage, stripNonLatin, type FontFamily, type PlacedBox } from './stamp'

/**
 * New content on top of a PDF: text, pictures, shapes and whiteout.
 *
 * Nothing already in the file is changed. Every item is a box in fractions of
 * the page as the reader sees it, the same model the signature and stamp tools
 * use, and `placeImage` turns that into the page's own coordinates whatever
 * its rotation. Text and shapes are then drawn in the box's own frame, so a
 * line of text on a sideways page still reads left to right on screen.
 */

export interface Point {
  x: number
  y: number
}

interface ItemBase {
  id: string
  /** 0-based */
  page: number
}

export interface TextItem extends ItemBase {
  kind: 'text'
  box: PlacedBox
  text: string
  /** points */
  size: number
  font: FontFamily
  bold: boolean
  /** #rrggbb */
  colour: string
}

export interface ImageItem extends ItemBase {
  kind: 'image'
  box: PlacedBox
  bytes: ArrayBuffer
  format: 'jpg' | 'png'
}

export interface ShapeItem extends ItemBase {
  kind: 'rect' | 'ellipse'
  box: PlacedBox
  stroke: string
  /** #rrggbb, or none for an outline */
  fill?: string
  /** points */
  width: number
}

export interface LineItem extends ItemBase {
  kind: 'line'
  from: Point
  to: Point
  stroke: string
  width: number
}

/** A white box over something. It hides it on the page; it does not remove it. */
export interface WhiteoutItem extends ItemBase {
  kind: 'whiteout'
  box: PlacedBox
}

export type EditItem = TextItem | ImageItem | ShapeItem | LineItem | WhiteoutItem

export const KIND_NAMES: Record<EditItem['kind'], string> = {
  text: 'Text',
  image: 'Picture',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  whiteout: 'Whiteout',
}

/** What an item is called to a screen reader and in the list. */
export function describeItem(item: EditItem): string {
  if (item.kind === 'text') return `Text: ${item.text.slice(0, 30) || 'empty'}`
  return KIND_NAMES[item.kind]
}

/** The box an item occupies, lines included, for selection and nudging. */
export function itemBox(item: EditItem): PlacedBox {
  if (item.kind !== 'line') return item.box
  return {
    x: Math.min(item.from.x, item.to.x),
    y: Math.min(item.from.y, item.to.y),
    w: Math.abs(item.to.x - item.from.x),
    h: Math.abs(item.to.y - item.from.y),
  }
}

/** Moves an item by a fraction of the page, keeping it on the page. */
export function moveItem(item: EditItem, dx: number, dy: number): EditItem {
  const box = itemBox(item)
  const sx = Math.min(1 - box.x - box.w, Math.max(-box.x, dx))
  const sy = Math.min(1 - box.y - box.h, Math.max(-box.y, dy))
  if (item.kind === 'line') {
    return {
      ...item,
      from: { x: item.from.x + sx, y: item.from.y + sy },
      to: { x: item.to.x + sx, y: item.to.y + sy },
    }
  }
  return { ...item, box: { ...item.box, x: item.box.x + sx, y: item.box.y + sy } }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = match ? Number.parseInt(match[1], 16) : 0
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

/**
 * A point in the box's own frame, measured from its bottom-left corner as the
 * reader sees it, in the page's coordinates. pdf-lib turns a rotated drawing
 * about its origin the same way, so text and shapes drawn from here line up
 * with an image placed by `placeImage`.
 */
export function boxPoint(spot: ReturnType<typeof placeImage>, lx: number, ly: number): Point {
  const angle = (spot.rotate * Math.PI) / 180
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  return { x: spot.x + lx * cos - ly * sin, y: spot.y + lx * sin + ly * cos }
}

/** Breaks text into lines that fit a width, keeping the writer's own line breaks. */
export function wrapLines(
  text: string,
  measure: (line: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      const next = line + word
      if (!line.trim() || measure(next.trimEnd()) <= maxWidth) line = next
      else {
        lines.push(line.trimEnd())
        line = word.trimStart()
      }
      // a single word wider than the box is broken where it has to be
      while (line.length > 1 && measure(line.trimEnd()) > maxWidth) {
        let cut = line.length - 1
        while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

export const LINE_HEIGHT = 1.2

export async function editPdf(file: File, items: EditItem[]): Promise<OutputFile> {
  const lib = await pdfLib()
  const { degrees, rgb } = lib
  const doc = await loadPdf(file)
  const pages = doc.getPages()

  const fonts = new Map<string, PDFFont>()
  const font = async (family: FontFamily, bold: boolean) => {
    const key = `${family}-${bold}`
    if (!fonts.has(key)) fonts.set(key, await embedFont(doc, family, bold))
    return fonts.get(key)!
  }
  const images = new Map<ArrayBuffer, PDFImage>()
  const image = async (item: ImageItem) => {
    if (!images.has(item.bytes)) {
      images.set(
        item.bytes,
        item.format === 'png' ? await doc.embedPng(item.bytes) : await doc.embedJpg(item.bytes),
      )
    }
    return images.get(item.bytes)!
  }
  const colour = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    return rgb(r, g, b)
  }

  let dropped = 0
  let placed = 0

  for (const item of items) {
    const page: PDFPage | undefined = pages[item.page]
    if (!page) continue
    placed++

    if (item.kind === 'line') {
      const from = placeImage(page, { ...item.from, w: 0, h: 0 })
      const to = placeImage(page, { ...item.to, w: 0, h: 0 })
      page.drawLine({
        start: { x: from.x, y: from.y },
        end: { x: to.x, y: to.y },
        thickness: item.width,
        color: colour(item.stroke),
        lineCap: lib.LineCapStyle.Round,
      })
      continue
    }

    const spot = placeImage(page, item.box)
    const rotate = degrees(spot.rotate)

    if (item.kind === 'image') {
      page.drawImage(await image(item), {
        x: spot.x,
        y: spot.y,
        width: spot.width,
        height: spot.height,
        rotate,
      })
    } else if (item.kind === 'whiteout') {
      page.drawRectangle({
        x: spot.x,
        y: spot.y,
        width: spot.width,
        height: spot.height,
        rotate,
        color: rgb(1, 1, 1),
      })
    } else if (item.kind === 'rect') {
      page.drawRectangle({
        x: spot.x,
        y: spot.y,
        width: spot.width,
        height: spot.height,
        rotate,
        color: item.fill ? colour(item.fill) : undefined,
        borderColor: colour(item.stroke),
        borderWidth: item.width,
      })
    } else if (item.kind === 'ellipse') {
      const centre = boxPoint(spot, spot.width / 2, spot.height / 2)
      page.drawEllipse({
        x: centre.x,
        y: centre.y,
        xScale: spot.width / 2,
        yScale: spot.height / 2,
        rotate,
        color: item.fill ? colour(item.fill) : undefined,
        borderColor: colour(item.stroke),
        borderWidth: item.width,
      })
    } else if (item.kind === 'text') {
      const face = await font(item.font, item.bold)
      const text = stripNonLatin(item.text, (n) => (dropped += n))
      const lines = wrapLines(text, (line) => face.widthOfTextAtSize(line, item.size), spot.width)
      // the first baseline sits one ascent below the top of the box
      const ascent = face.heightAtSize(item.size, { descender: false })
      lines.forEach((line, i) => {
        if (!line) return
        const at = boxPoint(spot, 0, spot.height - ascent - i * item.size * LINE_HEIGHT)
        page.drawText(line, {
          x: at.x,
          y: at.y,
          size: item.size,
          font: face,
          color: colour(item.colour),
          rotate,
        })
      })
    }
  }

  return {
    file: await savePdf(doc, `${baseName(file.name)}-edited.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${placed} item${placed === 1 ? '' : 's'} added`,
    warning: dropped
      ? `${dropped} character${dropped === 1 ? ' was' : 's were'} left out; the standard PDF fonts only cover Latin script`
      : undefined,
  }
}
