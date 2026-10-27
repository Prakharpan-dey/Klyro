import { comparableLines, diffLines } from '@/lib/diff'
import type { OutputFile, Progress } from '../types'
import { paragraphsToPdf, LAYOUT_DEFAULTS, type Paragraph } from '../office/layout'
import { baseName, pdfLib, savePdf } from './load'
import { closePdf, openPdf, renderPage } from './pdfjs'
import { extractPageText } from './text'

/**
 * Two versions of a document, and what changed between them.
 *
 * Two answers, because each misses what the other catches. The words: a line
 * diff per page, written up as a readable report — it finds a changed figure
 * in a contract but is blind to a scan. The picture: both versions rendered
 * and compared pixel by pixel, with every difference painted red over a faded
 * copy of the new page — it catches a moved signature or a swapped logo, and
 * works on scans, but cannot say what the words were.
 *
 * Pages are compared by position. A page inserted near the front shifts every
 * later page, which the report says plainly rather than guessing at an
 * alignment that would be wrong half the time.
 */

export interface CompareParams {
  /** resolution the pages are rendered at for the visual comparison */
  dpi: number
  /** per-channel difference below which a pixel counts as unchanged */
  threshold: number
}

export interface PageChange {
  page: number
  added: number
  removed: number
  /** share of the page's pixels that differ, 0 to 1; null if not compared */
  visual: number | null
  sizeDiffers: boolean
}

export interface CompareResult {
  outputs: OutputFile[]
  pages: PageChange[]
  pageCounts: [number, number]
}

/** Marks pixels that differ; returns the changed share and paints the overlay in place. */
export function paintDifference(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  out: Uint8ClampedArray,
  threshold: number,
): number {
  let changed = 0
  const pixels = after.length / 4
  for (let i = 0; i < after.length; i += 4) {
    const delta = Math.max(
      Math.abs(before[i] - after[i]),
      Math.abs(before[i + 1] - after[i + 1]),
      Math.abs(before[i + 2] - after[i + 2]),
    )
    if (delta > threshold) {
      changed++
      out[i] = 230
      out[i + 1] = 30
      out[i + 2] = 30
    } else {
      // the new page, faded towards white so red reads at a glance
      out[i] = 255 - (255 - after[i]) * 0.3
      out[i + 1] = 255 - (255 - after[i + 1]) * 0.3
      out[i + 2] = 255 - (255 - after[i + 2]) * 0.3
    }
    out[i + 3] = 255
  }
  return pixels ? changed / pixels : 0
}

function percent(share: number): string {
  if (share === 0) return '0%'
  if (share < 0.001) return 'under 0.1%'
  return `${(share * 100).toFixed(1)}%`
}

export async function comparePdfs(
  before: File,
  after: File,
  params: CompareParams,
  onProgress?: Progress,
): Promise<CompareResult> {
  const [a, b] = await Promise.all([openPdf(before), openPdf(after)])
  const { PDFDocument } = await pdfLib()

  try {
    const shared = Math.min(a.numPages, b.numPages)
    const total = Math.max(a.numPages, b.numPages)
    const scale = params.dpi / 72
    const overlay = await PDFDocument.create()
    const pages: PageChange[] = []
    const report: Paragraph[] = []
    let anyText = false

    for (let i = 0; i < total; i++) {
      onProgress?.(i, total, `Page ${i + 1} of ${total}`)
      const inA = i < a.numPages
      const inB = i < b.numPages

      const [textA, textB] = await Promise.all([
        inA ? extractPageText(a, i) : Promise.resolve(''),
        inB ? extractPageText(b, i) : Promise.resolve(''),
      ])
      if (textA.trim() || textB.trim()) anyText = true
      const ops = diffLines(comparableLines(textA), comparableLines(textB))
      const added = ops.filter((op) => op.kind === 'add')
      const removed = ops.filter((op) => op.kind === 'remove')

      let visual: number | null = null
      let sizeDiffers = false

      if (i < shared) {
        const [canvasA, canvasB] = await Promise.all([
          renderPage(a, i, scale),
          renderPage(b, i, scale),
        ])
        const { width, height } = canvasB
        sizeDiffers = canvasA.width !== width || canvasA.height !== height

        const page = await b.getPage(i + 1)
        const viewport = page.getViewport({ scale: 1 })
        page.cleanup()

        if (!sizeDiffers) {
          const ctxA = canvasA.getContext('2d')!
          const ctxB = canvasB.getContext('2d')!
          const dataA = ctxA.getImageData(0, 0, width, height).data
          const after = ctxB.getImageData(0, 0, width, height)
          const out = ctxB.createImageData(width, height)
          visual = paintDifference(dataA, after.data, out.data, params.threshold)
          ctxB.putImageData(out, 0, 0)
        }

        const blob = await new Promise<Blob>((resolve, reject) =>
          canvasB.toBlob((x) => (x ? resolve(x) : reject(new Error('Encoding failed'))), 'image/png'),
        )
        const image = await overlay.embedPng(await blob.arrayBuffer())
        overlay
          .addPage([viewport.width, viewport.height])
          .drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height })
      }

      pages.push({ page: i + 1, added: added.length, removed: removed.length, visual, sizeDiffers })

      if (!inA || !inB) {
        report.push({ text: `Page ${i + 1}`, style: 'h2' })
        report.push({
          text: inA
            ? `Only in ${before.name}: the new version has no page ${i + 1}.`
            : `Only in ${after.name}: added in the new version.`,
          style: 'body',
          italic: true,
        })
        for (const op of inA ? removed : added) {
          report.push({ text: `${inA ? 'Removed' : 'Added'}: ${op.text}`, style: 'body' })
        }
        continue
      }

      if (!added.length && !removed.length && !sizeDiffers && (visual ?? 0) === 0) continue

      report.push({ text: `Page ${i + 1}`, style: 'h2' })
      if (sizeDiffers) {
        report.push({ text: 'The page size changed, so the pictures were not overlaid.', style: 'body', italic: true })
      } else if (visual) {
        report.push({ text: `${percent(visual)} of the page looks different.`, style: 'body', italic: true })
      }
      for (const op of ops) {
        if (op.kind === 'remove') report.push({ text: `Removed: ${op.text}`, style: 'body' })
        if (op.kind === 'add') report.push({ text: `Added: ${op.text}`, style: 'body', bold: true })
      }
      if (!added.length && !removed.length && visual) {
        report.push({
          text: 'The words are the same; something else on the page moved or changed. See the overlay.',
          style: 'body',
        })
      }
    }

    onProgress?.(total, total, 'Writing the report')

    const changedPages = pages.filter(
      (p) => p.added || p.removed || p.sizeDiffers || (p.visual ?? 0) > 0 || p.page > shared,
    )
    const addedLines = pages.reduce((sum, p) => sum + p.added, 0)
    const removedLines = pages.reduce((sum, p) => sum + p.removed, 0)

    const summary: Paragraph[] = [
      { text: 'What changed', style: 'h1' },
      // WinAnsi has no arrow, so the standard fonts would drop one here
      { text: `${before.name}, compared with ${after.name}`, style: 'body', italic: true },
      {
        text: changedPages.length
          ? `${changedPages.length} of ${total} page${total === 1 ? '' : 's'} differ. ${addedLines} line${addedLines === 1 ? '' : 's'} added, ${removedLines} removed.`
          : 'No differences found: the words and the rendered pages are identical.',
        style: 'body',
      },
    ]
    if (a.numPages !== b.numPages) {
      summary.push({
        text: `The page count changed from ${a.numPages} to ${b.numPages}. Pages are compared by position, so everything after an inserted or removed page will show as changed.`,
        style: 'body',
      })
    }
    if (!anyText) {
      summary.push({
        text: 'Neither file has selectable text, which usually means scans. Only the visual overlay can show what changed.',
        style: 'body',
      })
    }

    const stem = `${baseName(before.name)}-vs-${baseName(after.name)}`
    const reportFile = await paragraphsToPdf(
      [...summary, ...report],
      { name: `${stem}-changes.pdf`, size: before.size + after.size },
      { ...LAYOUT_DEFAULTS, family: 'helvetica', size: 10 },
    )

    const outputs: OutputFile[] = [
      {
        ...reportFile,
        sourceName: `${before.name} + ${after.name}`,
        note: changedPages.length ? `${changedPages.length} pages differ` : 'identical',
      },
    ]
    if (overlay.getPageCount()) {
      outputs.push({
        file: await savePdf(overlay, `${stem}-overlay.pdf`),
        sourceName: `${before.name} + ${after.name}`,
        sourceSize: before.size + after.size,
        note: 'changes in red',
      })
    }

    return { outputs, pages, pageCounts: [a.numPages, b.numPages] }
  } finally {
    closePdf(a)
    closePdf(b)
  }
}
