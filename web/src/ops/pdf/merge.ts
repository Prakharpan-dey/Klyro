import type { OutputFile, Progress } from '../types'
import { loadPdf, pdfLib, savePdf } from './load'

export async function mergePdfs(
  files: File[],
  name = 'merged.pdf',
  onProgress?: Progress,
): Promise<OutputFile> {
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()

  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length + 1, file.name)
    const src = await loadPdf(file)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }

  onProgress?.(files.length, files.length + 1, 'Writing')
  const merged = await savePdf(out, name)
  onProgress?.(files.length + 1, files.length + 1, 'Done')

  return {
    file: merged,
    sourceName: files.map((f) => f.name).join(' + '),
    sourceSize: files.reduce((n, f) => n + f.size, 0),
    note: `${out.getPageCount()} pp`,
  }
}
