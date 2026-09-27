import type { OutputFile, Progress } from '../types'
import { EmptyDocumentError } from './docxToPdf'
import { htmlToParagraphs } from './html'
import { paragraphsToPdf, type LayoutParams } from './layout'

/** A saved web page, read for its text and laid out as a document. */
export async function htmlToPdf(
  file: File,
  params: LayoutParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Reading the page')
  const paragraphs = htmlToParagraphs(await file.text())
  if (!paragraphs.length) throw new EmptyDocumentError('page')

  return paragraphsToPdf(paragraphs, file, params, onProgress)
}
