import type { PDFDict, PDFDocument, PDFRef } from 'pdf-lib'
import type { OutputFile, Progress } from '../types'
import { baseName, loadPdf, pdfLib } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'

/**
 * The pictures inside a PDF, as they were put in.
 *
 * A JPEG photo is stored in a PDF byte for byte, so where nothing else is
 * layered on it (a transparency mask, an odd colour space, a decode remap) it
 * is copied straight back out: the original file, at the original quality.
 *
 * Everything else is stored in a PDF-only form: deflated rows, a palette, CMYK,
 * JPEG 2000, fax-style black and white. Rather than reimplement a decoder for
 * each, those images are moved onto pages of their own, one image per page at
 * one point per pixel, and pdf.js draws them. Whatever pdf.js can show, this
 * can extract, at the image's own resolution.
 */

export class ExtractImagesError extends Error {}

export interface ExtractImagesParams {
  /** images narrower or shorter than this are skipped: spacers, rules, masks */
  minSide: number
}

export interface FoundImage {
  ref: PDFRef
  /** 0-based page it first appears on */
  page: number
  width: number
  height: number
  /** the original JPEG, when it can be handed back untouched */
  jpeg?: Uint8Array
}

export interface ImageSurvey {
  images: FoundImage[]
  /** too small to be a picture anyone wants */
  skipped: number
}

/** Above this the redraw is scaled down; a browser canvas will not go much past it. */
const MAX_PIXELS = 40_000_000

type PdfLib = typeof import('pdf-lib')

function nameOf(lib: PdfLib, value: unknown): string | undefined {
  return value instanceof lib.PDFName ? value.decodeText() : undefined
}

/** True when the stream is a plain JPEG a viewer would show exactly as stored. */
function isPlainJpeg(lib: PdfLib, doc: PDFDocument, dict: PDFDict): boolean {
  const { PDFArray, PDFName, PDFRawStream } = lib
  const filter = dict.lookup(PDFName.of('Filter'))
  const filters =
    filter instanceof PDFArray
      ? filter.asArray().map((f) => nameOf(lib, doc.context.lookup(f)))
      : [nameOf(lib, filter)]
  if (filters.length !== 1 || filters[0] !== 'DCTDecode') return false

  // anything that changes how the pixels look means the JPEG alone is not the picture
  for (const key of ['SMask', 'Mask', 'Decode', 'SMaskInData']) {
    if (dict.has(PDFName.of(key))) return false
  }

  const space = dict.lookup(PDFName.of('ColorSpace'))
  const plain = nameOf(lib, space)
  if (plain) return plain === 'DeviceRGB' || plain === 'DeviceGray'
  // an ICC profile over grey or RGB still decodes to the same JPEG; CMYK JPEGs
  // are often stored inverted, which only the PDF's own settings undo
  if (space instanceof PDFArray && nameOf(lib, space.lookup(0)) === 'ICCBased') {
    const profile = space.lookup(1)
    if (profile instanceof PDFRawStream) {
      const n = profile.dict.lookup(PDFName.of('N'))
      return n instanceof lib.PDFNumber && (n.asNumber() === 1 || n.asNumber() === 3)
    }
  }
  return false
}

/** Every image XObject in the file, each once, in the order a reader meets them. */
export async function surveyImages(doc: PDFDocument, minSide: number): Promise<ImageSurvey> {
  const lib = await pdfLib()
  const { PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef } = lib
  const seen = new Set<string>()
  const images: FoundImage[] = []
  let skipped = 0

  const number = (dict: PDFDict, key: string) => {
    const value = dict.lookup(PDFName.of(key))
    return value instanceof PDFNumber ? value.asNumber() : 0
  }

  const visit = (resources: unknown, page: number) => {
    if (!(resources instanceof PDFDict)) return
    const xobjects = resources.lookup(PDFName.of('XObject'))
    if (!(xobjects instanceof PDFDict)) return

    for (const [, value] of xobjects.entries()) {
      if (!(value instanceof PDFRef)) continue
      const key = value.toString()
      if (seen.has(key)) continue
      seen.add(key)

      const stream = doc.context.lookup(value)
      if (!(stream instanceof PDFRawStream)) continue
      const subtype = nameOf(lib, stream.dict.lookup(PDFName.of('Subtype')))

      if (subtype === 'Form') {
        // a form is a page fragment with its own resources; logos often live in one
        visit(stream.dict.lookup(PDFName.of('Resources')), page)
        continue
      }
      if (subtype !== 'Image') continue

      const width = number(stream.dict, 'Width')
      const height = number(stream.dict, 'Height')
      const stencil = stream.dict.lookup(PDFName.of('ImageMask'))
      if (stencil === lib.PDFBool.True || Math.min(width, height) < minSide) {
        skipped++
        continue
      }

      images.push({
        ref: value,
        page,
        width,
        height,
        jpeg: isPlainJpeg(lib, doc, stream.dict) ? stream.contents : undefined,
      })
    }
  }

  doc.getPages().forEach((page, index) => visit(page.node.Resources(), index))
  return { images, skipped }
}

/** The size an image is redrawn at: its own, unless that is past what a canvas holds. */
export function redrawSize(width: number, height: number) {
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)))
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    reduced: scale < 1,
  }
}

/** Puts each image on its own page, one point per pixel, in a new document. */
async function redrawDocument(source: PDFDocument, images: FoundImage[]): Promise<Uint8Array> {
  const lib = await pdfLib()
  const {
    PDFDocument,
    PDFName,
    PDFObjectCopier,
    concatTransformationMatrix,
    drawObject,
    popGraphicsState,
    pushGraphicsState,
  } = lib
  const target = await PDFDocument.create()
  const copier = PDFObjectCopier.for(source.context, target.context)

  for (const image of images) {
    const size = redrawSize(image.width, image.height)
    const copied = copier.copy(source.context.lookup(image.ref)!)
    const ref = target.context.register(copied)
    const page = target.addPage([size.width, size.height])
    page.node.setXObject(PDFName.of('Im0'), ref)
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(size.width, 0, 0, size.height, 0, 0),
      drawObject('Im0'),
      popGraphicsState(),
    )
  }
  return target.save()
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ExtractImagesError('An image could not be saved')),
      'image/png',
    ),
  )
}

export async function extractImages(
  files: File[],
  params: ExtractImagesParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const out: OutputFile[] = []

  for (const file of files) {
    onProgress?.(0, 1, `Looking through ${file.name}`)
    const doc = await loadPdf(file)
    const { images, skipped } = await surveyImages(doc, params.minSide)
    if (!images.length) {
      throw new ExtractImagesError(
        skipped
          ? `${file.name} only has images smaller than ${params.minSide} pixels. Lower the minimum size to get them.`
          : `${file.name} has no images in it. If it is a scan, every page is one image; PDF → Images saves those.`,
      )
    }

    const base = baseName(file.name)
    const perPage = new Map<number, number>()
    const named = (image: FoundImage, extension: string) => {
      const n = (perPage.get(image.page) ?? 0) + 1
      perPage.set(image.page, n)
      return `${base}-p${image.page + 1}-${n}.${extension}`
    }
    // names are handed out in reading order, whichever route each image takes
    const names = new Map(images.map((image) => [image, named(image, image.jpeg ? 'jpg' : 'png')]))

    const redraw = images.filter((image) => !image.jpeg)
    const rendered = redraw.length
      ? await openPdf(new Blob([(await redrawDocument(doc, redraw)) as BlobPart]))
      : undefined

    try {
      for (const [i, image] of images.entries()) {
        onProgress?.(i, images.length, `${file.name} · image ${i + 1} of ${images.length}`)
        const name = names.get(image)!

        if (image.jpeg) {
          out.push({
            file: new File([image.jpeg as BlobPart], name, { type: 'image/jpeg' }),
            sourceName: file.name,
            sourceSize: file.size,
            width: image.width,
            height: image.height,
            note: 'original',
          })
          continue
        }

        const canvas = await renderPage(rendered!, redraw.indexOf(image), 1, 'transparent')
        const size = redrawSize(image.width, image.height)
        const blob = await canvasToPng(canvas)
        canvas.width = 0
        canvas.height = 0
        out.push({
          file: new File([blob], name, { type: 'image/png' }),
          sourceName: file.name,
          sourceSize: file.size,
          width: size.width,
          height: size.height,
          warning: size.reduced
            ? `Saved at ${size.width}×${size.height}; the original ${image.width}×${image.height} is more than a browser can draw`
            : undefined,
        })
      }
    } finally {
      if (rendered) await closePdf(rendered)
    }

    if (skipped && out.length) {
      const last = out[out.length - 1]
      last.note = [last.note, `${skipped} small skipped`].filter(Boolean).join(' · ')
    }
  }

  onProgress?.(1, 1, 'Done')
  return out
}
