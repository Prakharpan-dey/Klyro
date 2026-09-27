import type { OutputFile, Progress } from '../types'
import { EmptyDocumentError } from './docxToPdf'
import { sheetsToPdf, type ExcelToPdfParams } from './excelToPdf'
import { paragraphsToPdf, type LayoutParams } from './layout'
import { readOdfContent, readOdsSheets, readOdtParagraphs } from './odf'

/** The two OpenDocument conversions, each handing off to a renderer that already exists. */

export async function odtToPdf(
  file: File,
  params: LayoutParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Reading the document')
  const content = await readOdfContent(file)
  const paragraphs = readOdtParagraphs(content)
  if (!paragraphs.length) throw new EmptyDocumentError('OpenDocument file')

  return paragraphsToPdf(paragraphs, file, params, onProgress)
}

export async function odsToPdf(
  file: File,
  params: ExcelToPdfParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Reading the spreadsheet')
  const content = await readOdfContent(file)
  const sheets = readOdsSheets(content)
  if (!sheets.length) throw new EmptyDocumentError('spreadsheet')

  return sheetsToPdf(sheets, file, params, onProgress)
}
