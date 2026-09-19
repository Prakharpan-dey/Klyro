import { parsePageList, parsePageRanges } from '@/lib/pageRange'
import type { ImageFormat, ResizeSpec } from '@/lib/imageMath'
import { compressImages } from '@/ops/image/compress'
import { convertImages } from '@/ops/image/convert'
import { stripMetadata } from '@/ops/image/exif'
import { resizeImages } from '@/ops/image/resize'
import { pdfToDocx } from '@/ops/office/docx'
import { excelToPdf } from '@/ops/office/excelToPdf'
import { pdfToXlsx } from '@/ops/office/pdfToXlsx'
import { alternateMix, insertBlankPages, reversePdf } from '@/ops/pdf/arrange'
import { flattenPdf } from '@/ops/pdf/forms'
import { imagesToPdf } from '@/ops/pdf/fromImages'
import {
  cropPages,
  dividePages,
  makeBooklet,
  overlayPdf,
  pagesPerSheet,
  resizePages,
} from '@/ops/pdf/geometry'
import { loadPdf } from '@/ops/pdf/load'
import { mergePdfs } from '@/ops/pdf/merge'
import { clearMetadata, writeMetadata } from '@/ops/pdf/metadata'
import { runOcr } from '@/ops/pdf/ocr'
import { deletePages, rebuildPdf, rotatePages } from '@/ops/pdf/pages'
import { removeAnnotations, stripPdf } from '@/ops/pdf/privacy'
import { linearizePdf, repairPdf } from '@/ops/pdf/qpdf'
import { rasterizePdf, removeBlankPages } from '@/ops/pdf/raster'
import { splitPdf } from '@/ops/pdf/split'
import { fillTemplate, stampText, type Anchor } from '@/ops/pdf/stamp'
import { pdfToText } from '@/ops/pdf/text'
import { textToPdf } from '@/ops/pdf/textToPdf'
import { pdfToImages } from '@/ops/pdf/toImages'
import { compressVideo, convertVideo, stripAudio, trimVideo } from '@/ops/video/ops'
import type { OutputFile } from '@/ops/types'
import type { StepRunner } from './execute'

const mime = (f: 'jpeg' | 'png' | 'webp'): ImageFormat => `image/${f}`

async function eachFile(files: File[], fn: (file: File) => Promise<OutputFile | OutputFile[]>) {
  const out: OutputFile[] = []
  for (const file of files) out.push(...[await fn(file)].flat())
  return out
}

async function pageCount(file: File) {
  return (await loadPdf(file)).getPageCount()
}

function pdfName(name: string | undefined, fallback: string) {
  return `${name?.trim().replace(/\.pdf$/i, '') || fallback}.pdf`
}

/** A sheet size the geometry ops accept: they lay out on paper, so "fit" has no meaning. */
function sheet(size: 'a4' | 'letter' | 'fit' | undefined): 'a4' | 'letter' {
  return size === 'letter' ? 'letter' : 'a4'
}

/** "top,right,bottom,left" in millimetres; a short list repeats CSS-style. */
function margins(spec: string) {
  const parts = spec
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (!parts.length) throw new Error(`Could not read the margins "${spec}"`)
  const [a, b = a, c = a, d = b] = parts
  return { top: a, right: b, bottom: c, left: d }
}

/** Resolves the optional `pages` param to 0-based indices, or undefined for every page. */
async function selectedPages(file: File, pages: string | undefined) {
  if (!pages) return undefined
  const parsed = parsePageList(pages, await pageCount(file))
  if (parsed.error) throw new Error(parsed.error)
  return parsed.pages
}

/** Maps planner steps onto the same local operations the tool pages use. */
export const runStep: StepRunner = async (step, inputs, report) => {
  const p = step.params
  const progress = (_done: number, _total: number, label: string) => report(label)

  switch (step.op) {
    case 'image.compress':
      return compressImages(
        inputs,
        {
          format: p.format === 'webp' ? 'image/webp' : 'image/jpeg',
          quality: (p.quality ?? 75) / 100,
          targetKB: p.targetKB,
        },
        progress,
      )

    case 'image.resize': {
      const unit = p.unit ?? (p.percent ? 'percent' : 'px')
      const keepAspect = p.keepAspect ?? true
      const resize: ResizeSpec =
        unit === 'percent'
          ? { mode: 'percent', percent: p.percent ?? 50 }
          : unit === 'cm'
            ? { mode: 'cm', width: p.width, height: p.height, dpi: p.dpi ?? 300, keepAspect }
            : { mode: 'px', width: p.width, height: p.height, keepAspect }
      return resizeImages(
        inputs,
        { resize, format: p.format ? mime(p.format) : 'keep', quality: (p.quality ?? 92) / 100 },
        progress,
      )
    }

    case 'image.convert':
      return convertImages(
        inputs,
        { format: mime(p.format ?? 'jpeg'), quality: (p.quality ?? 88) / 100 },
        progress,
      )

    case 'image.stripExif':
      return stripMetadata(inputs, progress)

    case 'pdf.merge':
      return [await mergePdfs(inputs, pdfName(p.name, 'merged'), progress)]

    case 'pdf.split':
      return eachFile(inputs, (file) =>
        splitPdf(
          file,
          p.ranges ? { mode: 'ranges', ranges: p.ranges } : { mode: 'every', size: p.everyN ?? 1 },
          progress,
        ),
      )

    case 'pdf.extract':
      return eachFile(inputs, (file) =>
        splitPdf(file, { mode: 'extract', pages: p.pages ?? '1' }, progress),
      )

    case 'pdf.deletePages':
      return eachFile(inputs, async (file) => {
        report(`Removing pages from ${file.name}`)
        const { pages, error } = parsePageList(p.pages ?? '', await pageCount(file))
        if (error) throw new Error(error)
        return deletePages(file, pages)
      })

    case 'pdf.rotate':
      return eachFile(inputs, async (file) => {
        report(`Rotating ${file.name}`)
        return rotatePages(file, (await selectedPages(file, p.pages)) ?? 'all', p.degrees ?? 90)
      })

    case 'pdf.reorder':
      return eachFile(inputs, async (file) => {
        report(`Reordering ${file.name}`)
        const { groups, error } = parsePageRanges(p.order ?? '', await pageCount(file))
        if (error) throw new Error(error)
        const edits = groups.flat().map((index) => ({ index, rotate: 0 }))
        return rebuildPdf(file, edits, '-reordered')
      })

    case 'pdf.reverse':
      return eachFile(inputs, async (file) => {
        report(`Reversing ${file.name}`)
        return reversePdf(file)
      })

    case 'pdf.insertBlank':
      return eachFile(inputs, async (file) => {
        report(`Adding blank pages to ${file.name}`)
        return insertBlankPages(file, {
          positions: p.positions ?? '1',
          where: p.where ?? 'after',
          count: p.count ?? 1,
          size: p.pageSize === 'a4' || p.pageSize === 'letter' ? p.pageSize : 'match',
        })
      })

    case 'pdf.removeBlank':
      return eachFile(inputs, (file) => removeBlankPages(file, p.thresholdPercent ?? 0.5, progress))

    case 'pdf.alternateMix':
      return [
        await alternateMix(inputs, {
          reverseSecond: p.reverseSecond ?? false,
          step: p.step ?? 1,
        }),
      ]

    case 'pdf.crop':
      return eachFile(inputs, async (file) => {
        report(`Cropping ${file.name}`)
        return cropPages(file, {
          ...margins(p.cropMm ?? '0'),
          pages: await selectedPages(file, p.pages),
        })
      })

    case 'pdf.nUp':
      return eachFile(inputs, async (file) => {
        report(`Laying out ${file.name}`)
        return pagesPerSheet(file, {
          perSheet: p.perSheet ?? 2,
          size: sheet(p.pageSize),
          orientation: p.orientation ?? 'auto',
          marginMm: p.marginMm ?? 10,
          gapMm: p.gapMm ?? 5,
        })
      })

    case 'pdf.booklet':
      return eachFile(inputs, async (file) => {
        report(`Imposing ${file.name}`)
        return makeBooklet(file, sheet(p.pageSize))
      })

    case 'pdf.divide':
      return eachFile(inputs, async (file) => {
        report(`Dividing ${file.name}`)
        return dividePages(file, p.divideMode ?? 'vertical')
      })

    case 'pdf.fixSize':
      return eachFile(inputs, async (file) => {
        report(`Resizing ${file.name}`)
        return resizePages(file, {
          size: sheet(p.pageSize),
          orientation: p.orientation ?? 'auto',
          marginMm: p.marginMm ?? 10,
        })
      })

    case 'pdf.overlay':
      return [
        await overlayPdf(inputs, {
          mode: p.mode ?? 'first',
          opacity: p.opacity ?? 1,
          scale: p.scale ?? 1,
        }),
      ]

    case 'pdf.watermark':
      return eachFile(inputs, async (file) => {
        report(`Watermarking ${file.name}`)
        const size = p.fontSize ?? 48
        return stampText(file, {
          textFor: () => p.text ?? '',
          anchor: p.anchor ?? 'center',
          family: p.family ?? 'helvetica',
          bold: true,
          size: p.tile ? Math.max(12, Math.round(size / 3)) : size,
          marginMm: 0,
          opacity: p.opacity ?? 0.15,
          rotate: p.tilt ?? 45,
          tile: p.tile,
          suffix: '-watermarked',
        })
      })

    case 'pdf.pageNumbers':
      return eachFile(inputs, async (file) => {
        report(`Numbering ${file.name}`)
        const skip = p.skip ?? 0
        const first = p.start ?? 1
        return stampText(file, {
          textFor: (index, count) =>
            index < skip
              ? ''
              : fillTemplate(p.template ?? '{n}', first + index - skip, count - skip),
          anchor: p.anchor ?? 'bottom-center',
          family: p.family ?? 'helvetica',
          size: p.fontSize ?? 10,
          marginMm: p.marginMm ?? 12,
          suffix: '-numbered',
        })
      })

    case 'pdf.headerFooter':
      return eachFile(inputs, async (file) => {
        report(`Stamping ${file.name}`)
        return stampText(file, {
          textFor: (index, count) => fillTemplate(p.template ?? '', index + 1, count),
          anchor: p.anchor ?? 'top-center',
          family: p.family ?? 'helvetica',
          size: p.fontSize ?? 9,
          marginMm: p.marginMm ?? 10,
          suffix: '-stamped',
        })
      })

    case 'pdf.bates': {
      // the whole point of Bates numbering is that it runs on across the set
      let counter = p.start ?? 1
      const digits = p.digits ?? 6
      const out: OutputFile[] = []
      for (const file of inputs) {
        report(`Numbering ${file.name}`)
        const first = counter
        out.push(
          await stampText(file, {
            textFor: (index) => `${p.prefix ?? ''}${String(first + index).padStart(digits, '0')}`,
            anchor: p.anchor ?? 'bottom-right',
            family: 'courier',
            size: p.fontSize ?? 9,
            marginMm: p.marginMm ?? 10,
            suffix: '-bates',
          }),
        )
        counter = first + (await pageCount(file))
      }
      return out
    }

    case 'pdf.fromImages':
      return [
        await imagesToPdf(
          inputs,
          {
            pageSize: p.pageSize ?? 'a4',
            orientation: p.orientation ?? 'auto',
            marginMm: p.marginMm ?? 10,
            name: pdfName(p.name, 'images'),
          },
          progress,
        ),
      ]

    case 'pdf.toImages':
      return pdfToImages(
        inputs,
        { format: p.format === 'png' ? 'image/png' : 'image/jpeg', dpi: p.dpi ?? 150 },
        progress,
      )

    case 'pdf.fromText':
      return [
        await textToPdf({
          text: p.text ?? '',
          pageSize: p.pageSize === 'letter' ? 'letter' : 'a4',
          family: p.family ?? 'helvetica',
          size: p.fontSize ?? 11,
          marginMm: p.marginMm ?? 20,
          name: p.name,
        }),
      ]

    case 'pdf.toText':
      return eachFile(inputs, (file) =>
        pdfToText(
          file,
          { shape: p.shape ?? 'joined', pageMarkers: p.pageMarkers ?? false },
          progress,
        ),
      )

    case 'pdf.toDocx':
      return eachFile(inputs, (file) =>
        pdfToDocx(file, { pageBreaks: true, pageHeadings: false, mergeWrapped: true }, progress),
      )

    case 'pdf.toExcel':
      return eachFile(inputs, (file) =>
        pdfToXlsx(
          file,
          { fit: 'normal', sheetPerPage: p.sheetPerPage ?? false, parseNumbers: true },
          progress,
        ),
      )

    case 'pdf.fromExcel':
      return eachFile(inputs, (file) =>
        excelToPdf(
          file,
          {
            pageSize: p.pageSize === 'letter' ? 'letter' : 'a4',
            landscape: p.landscape ?? false,
            family: p.family ?? 'helvetica',
            size: p.fontSize ?? 9,
            marginMm: p.marginMm ?? 12,
            headerRow: true,
            gridLines: true,
          },
          progress,
        ),
      )

    case 'pdf.ocr':
      return runOcr(
        inputs,
        {
          language: p.language ?? 'eng',
          dpi: p.dpi ?? 200,
          output: p.output ?? 'searchable',
        },
        progress,
      )

    case 'pdf.compress':
      return eachFile(inputs, (file) =>
        rasterizePdf(
          file,
          {
            dpi: p.dpi ?? 120,
            quality: (p.quality ?? 70) / 100,
            filter: p.filter ?? 'none',
            targetKB: p.targetKB,
          },
          progress,
        ),
      )

    case 'pdf.rasterize':
      return eachFile(inputs, (file) =>
        rasterizePdf(
          file,
          {
            dpi: p.dpi ?? 150,
            quality: (p.quality ?? 85) / 100,
            filter: p.filter ?? 'none',
            lossless: p.lossless,
          },
          progress,
        ),
      )

    case 'pdf.repair':
      return eachFile(inputs, async (file) => {
        report(`Repairing ${file.name}`)
        return repairPdf(file)
      })

    case 'pdf.linearize':
      return eachFile(inputs, async (file) => {
        report(`Restructuring ${file.name}`)
        return linearizePdf(file)
      })

    case 'pdf.flatten':
      return eachFile(inputs, async (file) => {
        report(`Flattening ${file.name}`)
        return flattenPdf(file)
      })

    case 'pdf.strip':
      return eachFile(inputs, async (file) => {
        report(`Cleaning ${file.name}`)
        return stripPdf(file)
      })

    case 'pdf.removeAnnotations':
      return eachFile(inputs, async (file) => {
        report(`Removing annotations from ${file.name}`)
        return removeAnnotations(file)
      })

    case 'pdf.setMetadata':
      return eachFile(inputs, async (file) => {
        const fields = {
          ...(p.title !== undefined ? { title: p.title } : {}),
          ...(p.author !== undefined ? { author: p.author } : {}),
          ...(p.subject !== undefined ? { subject: p.subject } : {}),
          ...(p.keywords !== undefined ? { keywords: p.keywords } : {}),
        }
        report(
          Object.keys(fields).length
            ? `Updating the details of ${file.name}`
            : `Clearing the details of ${file.name}`,
        )
        return Object.keys(fields).length ? writeMetadata(file, fields) : clearMetadata(file)
      })

    case 'video.compress':
      return compressVideo(
        inputs,
        {
          mode: p.targetMB ? 'target' : 'quality',
          targetMB: p.targetMB ?? 0,
          tier: p.tier ?? 'balanced',
          height: p.heightPx ?? 0,
          muted: p.muted ?? false,
          container: p.container ?? 'mp4',
        },
        progress,
      )

    case 'video.convert':
      return convertVideo(inputs, { container: p.container ?? 'mp4' }, progress)

    case 'video.trim':
      return trimVideo(
        inputs,
        { start: p.startSec ?? 0, end: p.endSec ?? 0, container: p.container },
        progress,
      )

    case 'video.extractAudio':
      return stripAudio(inputs, { keep: 'audio', container: p.container }, progress)
  }
}

/** Kept honest by the exhaustive switch above: every op has a runner. */
export type { Anchor }
