import type { PDFDocument, PDFPage } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { mmToPt } from './stamp'

export type SheetSize = 'a4' | 'letter' | 'match'
export type Orientation = 'auto' | 'portrait' | 'landscape'

const SHEETS = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
}

export function sheetSize(
  size: Exclude<SheetSize, 'match'>,
  orientation: Orientation,
): [number, number] {
  const [w, h] = SHEETS[size]
  return orientation === 'landscape' ? [h, w] : [w, h]
}

/**
 * Embeds a source page, or returns null when the page has no content stream.
 * A truly blank page cannot be embedded (pdf-lib throws while saving), so those
 * slots are left empty instead of failing the whole document.
 */
async function embedOrSkip(
  out: PDFDocument,
  page: PDFPage,
  box?: { left: number; bottom: number; right: number; top: number },
) {
  if (!page.node.Contents()) return null
  return out.embedPage(page, box)
}

/** Largest scale that fits `src` inside `box`, never enlarging past 1 unless asked. */
export function fitScale(
  src: { width: number; height: number },
  box: { width: number; height: number },
  allowUpscale = true,
) {
  const scale = Math.min(box.width / src.width, box.height / src.height)
  return allowUpscale ? scale : Math.min(1, scale)
}

export interface CropParams {
  /** margins to cut away, in millimetres */
  top: number
  right: number
  bottom: number
  left: number
  /** 0-based pages; every page when omitted */
  pages?: number[]
}

export async function cropPages(file: File, params: CropParams): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const only = params.pages ? new Set(params.pages) : null

  doc.getPages().forEach((page, index) => {
    if (only && !only.has(index)) return
    const box = page.getCropBox()
    const left = mmToPt(params.left)
    const right = mmToPt(params.right)
    const top = mmToPt(params.top)
    const bottom = mmToPt(params.bottom)
    const width = box.width - left - right
    const height = box.height - top - bottom
    if (width <= 1 || height <= 1) throw new Error('Those margins would remove the whole page')
    page.setCropBox(box.x + left, box.y + bottom, width, height)
  })

  return {
    file: await savePdf(doc, `${baseName(file.name)}-cropped.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${doc.getPageCount()} pp`,
  }
}

export interface ResizeParams {
  size: Exclude<SheetSize, 'match'>
  orientation: Orientation
  marginMm: number
}

/** Redraws every page centred on a uniform sheet size. */
export async function resizePages(file: File, params: ResizeParams): Promise<OutputFile> {
  const src = await loadPdf(file)
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()
  const margin = mmToPt(params.marginMm)

  for (const [index, page] of src.getPages().entries()) {
    const landscape = page.getWidth() > page.getHeight()
    const orientation: Orientation =
      params.orientation === 'auto' ? (landscape ? 'landscape' : 'portrait') : params.orientation
    const [sheetW, sheetH] = sheetSize(params.size, orientation)

    const embedded = await embedOrSkip(out, src.getPage(index))
    if (!embedded) {
      out.addPage([sheetW, sheetH])
      continue
    }
    const box = { width: sheetW - margin * 2, height: sheetH - margin * 2 }
    const scale = fitScale({ width: embedded.width, height: embedded.height }, box)
    const width = embedded.width * scale
    const height = embedded.height * scale

    out.addPage([sheetW, sheetH]).drawPage(embedded, {
      x: (sheetW - width) / 2,
      y: (sheetH - height) / 2,
      width,
      height,
    })
  }

  return {
    file: await savePdf(out, `${baseName(file.name)}-${params.size}.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} pp`,
  }
}

export interface NUpParams {
  /** pages placed on each sheet */
  perSheet: 2 | 4 | 6 | 9
  size: Exclude<SheetSize, 'match'>
  orientation: Orientation
  marginMm: number
  gapMm: number
}

export function gridFor(perSheet: number): { cols: number; rows: number } {
  switch (perSheet) {
    case 2:
      return { cols: 1, rows: 2 }
    case 4:
      return { cols: 2, rows: 2 }
    case 6:
      return { cols: 2, rows: 3 }
    default:
      return { cols: 3, rows: 3 }
  }
}

export async function pagesPerSheet(file: File, params: NUpParams): Promise<OutputFile> {
  const src = await loadPdf(file)
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()

  const { cols, rows } = gridFor(params.perSheet)
  const [sheetW, sheetH] = sheetSize(
    params.size,
    params.orientation === 'auto' ? 'portrait' : params.orientation,
  )
  const margin = mmToPt(params.marginMm)
  const gap = mmToPt(params.gapMm)
  const cellW = (sheetW - margin * 2 - gap * (cols - 1)) / cols
  const cellH = (sheetH - margin * 2 - gap * (rows - 1)) / rows

  const indices = src.getPageIndices()
  for (let start = 0; start < indices.length; start += params.perSheet) {
    const sheet = out.addPage([sheetW, sheetH])
    const slice = indices.slice(start, start + params.perSheet)

    for (const [slot, pageIndex] of slice.entries()) {
      const col = slot % cols
      const row = Math.floor(slot / cols)
      const embedded = await embedOrSkip(out, src.getPage(pageIndex))
      if (!embedded) continue
      const scale = fitScale(
        { width: embedded.width, height: embedded.height },
        { width: cellW, height: cellH },
      )
      const width = embedded.width * scale
      const height = embedded.height * scale
      // rows run top to bottom, PDF coordinates run bottom to top
      const cellX = margin + col * (cellW + gap)
      const cellY = sheetH - margin - (row + 1) * cellH - row * gap

      sheet.drawPage(embedded, {
        x: cellX + (cellW - width) / 2,
        y: cellY + (cellH - height) / 2,
        width,
        height,
      })
    }
  }

  return {
    file: await savePdf(out, `${baseName(file.name)}-${params.perSheet}up.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} sheets`,
  }
}

/** Saddle-stitch order: printed double sided and folded, the pages read in sequence. */
export function bookletOrder(pageCount: number): (number | null)[] {
  const padded = Math.ceil(pageCount / 4) * 4
  const order: (number | null)[] = []
  for (let i = 0; i < padded / 2; i += 2) {
    const last = padded - 1 - i
    const first = i
    order.push(last >= pageCount ? null : last, first >= pageCount ? null : first)
    const backLeft = i + 1
    const backRight = padded - 2 - i
    order.push(backLeft >= pageCount ? null : backLeft, backRight >= pageCount ? null : backRight)
  }
  return order
}

export async function makeBooklet(
  file: File,
  size: Exclude<SheetSize, 'match'>,
): Promise<OutputFile> {
  const src = await loadPdf(file)
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()
  const [sheetW, sheetH] = sheetSize(size, 'landscape')
  const order = bookletOrder(src.getPageCount())

  for (let i = 0; i < order.length; i += 2) {
    const sheet = out.addPage([sheetW, sheetH])
    for (const [slot, pageIndex] of order.slice(i, i + 2).entries()) {
      if (pageIndex === null) continue
      const embedded = await embedOrSkip(out, src.getPage(pageIndex))
      if (!embedded) continue
      const box = { width: sheetW / 2, height: sheetH }
      const scale = fitScale({ width: embedded.width, height: embedded.height }, box)
      const width = embedded.width * scale
      const height = embedded.height * scale
      sheet.drawPage(embedded, {
        x: slot * (sheetW / 2) + (sheetW / 2 - width) / 2,
        y: (sheetH - height) / 2,
        width,
        height,
      })
    }
  }

  return {
    file: await savePdf(out, `${baseName(file.name)}-booklet.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} sheets`,
  }
}

export type DivideMode = 'vertical' | 'horizontal' | 'quarters'

/** Cuts each page into parts, useful for scans holding two book pages side by side. */
export async function dividePages(file: File, mode: DivideMode): Promise<OutputFile> {
  const src = await loadPdf(file)
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()

  const parts = (page: PDFPage) => {
    const { x, y, width, height } = page.getCropBox()
    if (mode === 'vertical') {
      return [
        { x, y, width: width / 2, height },
        { x: x + width / 2, y, width: width / 2, height },
      ]
    }
    if (mode === 'horizontal') {
      return [
        { x, y: y + height / 2, width, height: height / 2 },
        { x, y, width, height: height / 2 },
      ]
    }
    return [
      { x, y: y + height / 2, width: width / 2, height: height / 2 },
      { x: x + width / 2, y: y + height / 2, width: width / 2, height: height / 2 },
      { x, y, width: width / 2, height: height / 2 },
      { x: x + width / 2, y, width: width / 2, height: height / 2 },
    ]
  }

  for (const index of src.getPageIndices()) {
    const source = src.getPage(index)
    for (const part of parts(source)) {
      const embedded = await embedOrSkip(out, source, {
        left: part.x,
        bottom: part.y,
        right: part.x + part.width,
        top: part.y + part.height,
      })
      const page = out.addPage([part.width, part.height])
      if (embedded) {
        page.drawPage(embedded, { x: 0, y: 0, width: part.width, height: part.height })
      }
    }
  }

  return {
    file: await savePdf(out, `${baseName(file.name)}-divided.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${out.getPageCount()} pp`,
  }
}

export interface OverlayParams {
  /** 'first' stamps page 1 of the overlay everywhere; 'sequence' pairs page by page */
  mode: 'first' | 'sequence'
  opacity: number
  scale: number
}

export async function overlayPdf(files: File[], params: OverlayParams): Promise<OutputFile> {
  if (files.length !== 2) throw new Error('Add the base PDF and the one to lay over it')
  const [base, layer] = await Promise.all(files.map((f) => loadPdf(f)))
  const layerCount = layer.getPageCount()

  for (const [index, page] of base.getPages().entries()) {
    const layerIndex = params.mode === 'first' ? 0 : index
    if (layerIndex >= layerCount) break

    const embedded = await embedOrSkip(base, layer.getPage(layerIndex))
    if (!embedded) continue
    const scale =
      fitScale(
        { width: embedded.width, height: embedded.height },
        { width: page.getWidth(), height: page.getHeight() },
      ) * params.scale
    const width = embedded.width * scale
    const height = embedded.height * scale

    page.drawPage(embedded, {
      x: (page.getWidth() - width) / 2,
      y: (page.getHeight() - height) / 2,
      width,
      height,
      opacity: params.opacity,
    })
  }

  return {
    file: await savePdf(base, `${baseName(files[0].name)}-overlay.pdf`),
    sourceName: files.map((f) => f.name).join(' + '),
    sourceSize: files.reduce((n, f) => n + f.size, 0),
    note: `${base.getPageCount()} pp`,
  }
}
