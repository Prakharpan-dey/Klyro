import { parsePageList, parsePageRanges } from '@/lib/pageRange'
import type { ImageFormat, ResizeSpec } from '@/lib/imageMath'
import { compressImages } from '@/ops/image/compress'
import { convertImages } from '@/ops/image/convert'
import { resizeImages } from '@/ops/image/resize'
import { imagesToPdf } from '@/ops/pdf/fromImages'
import { loadPdf } from '@/ops/pdf/load'
import { mergePdfs } from '@/ops/pdf/merge'
import { deletePages, rebuildPdf, rotatePages } from '@/ops/pdf/pages'
import { splitPdf } from '@/ops/pdf/split'
import { pdfToImages } from '@/ops/pdf/toImages'
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
        let pages: number[] | 'all' = 'all'
        if (p.pages) {
          const parsed = parsePageList(p.pages, await pageCount(file))
          if (parsed.error) throw new Error(parsed.error)
          pages = parsed.pages
        }
        return rotatePages(file, pages, p.degrees ?? 90)
      })

    case 'pdf.reorder':
      return eachFile(inputs, async (file) => {
        report(`Reordering ${file.name}`)
        const { groups, error } = parsePageRanges(p.order ?? '', await pageCount(file))
        if (error) throw new Error(error)
        const edits = groups.flat().map((index) => ({ index, rotate: 0 }))
        return rebuildPdf(file, edits, '-reordered')
      })

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
  }
}
