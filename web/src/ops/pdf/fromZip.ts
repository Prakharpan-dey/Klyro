import type { OutputFile, Progress } from '../types'
import { imagesToPdf, type ImagesToPdfParams } from './fromImages'
import { baseName, loadPdf, pdfLib, savePdf } from './load'

/**
 * Builds one PDF out of the contents of a zip.
 *
 * The usual case is a folder of scans someone zipped before emailing it. Images
 * become pages and any PDFs already inside are appended whole, in the order the
 * names sort — which is the order a person numbering files expects, not the
 * order the archive happens to store them in.
 *
 * Anything else in the archive is ignored rather than refused: a stray
 * README.txt beside forty scans should not fail the job.
 */

const IMAGE = /\.(jpe?g|png|webp|bmp|avif|gif)$/i
const PDF = /\.pdf$/i

/** Sorts the way a person reads: page2 before page10, and case is not a category. */
export function naturalOrder(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export class EmptyArchiveError extends Error {
  constructor() {
    super('No images or PDFs in this archive. Klyro can only page through those.')
  }
}

export async function zipToPdf(
  file: File,
  params: ImagesToPdfParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Opening the archive')
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && (IMAGE.test(entry.name) || PDF.test(entry.name)))
    // __MACOSX holds resource forks, not the files a user thinks they zipped
    .filter((entry) => !entry.name.startsWith('__MACOSX/') && !entry.name.includes('/._'))
    .sort((a, b) => naturalOrder(a.name, b.name))

  if (!entries.length) throw new EmptyArchiveError()

  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()
  let pageCount = 0

  for (const [i, entry] of entries.entries()) {
    onProgress?.(i, entries.length, entry.name)
    const bytes = await entry.async('blob')
    const name = entry.name.split('/').pop() ?? entry.name
    const inner = new File([bytes], name)

    if (PDF.test(entry.name)) {
      const src = await loadPdf(inner)
      const copied = await out.copyPages(src, src.getPageIndices())
      for (const page of copied) out.addPage(page)
      pageCount += copied.length
      continue
    }

    // one image at a time through the existing builder, so page sizing,
    // orientation and margins behave exactly as they do in Images → PDF
    const single = await imagesToPdf([inner], params)
    const src = await loadPdf(single.file)
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const page of copied) out.addPage(page)
    pageCount += copied.length
  }

  return {
    file: await savePdf(out, `${baseName(file.name)}.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${entries.length} files · ${pageCount} pp`,
  }
}
