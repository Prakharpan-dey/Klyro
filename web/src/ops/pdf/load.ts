import type { PDFDocument } from 'pdf-lib'

let lib: Promise<typeof import('pdf-lib')> | null = null

export function pdfLib() {
  lib ??= import('pdf-lib')
  return lib
}

export class PdfLoadError extends Error {}

export async function loadPdf(file: Blob & { name?: string }): Promise<PDFDocument> {
  const { PDFDocument } = await pdfLib()
  const bytes = await file.arrayBuffer()
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false })
    return doc
  } catch (err) {
    const name = file.name ?? 'This file'
    if (err instanceof Error && /encrypt/i.test(err.message)) {
      throw new PdfLoadError(`${name} is password protected`)
    }
    throw new PdfLoadError(`${name} could not be read as a PDF`)
  }
}

export async function savePdf(doc: PDFDocument, name: string): Promise<File> {
  const bytes = await doc.save({ useObjectStreams: true })
  return new File([bytes as BlobPart], name, { type: 'application/pdf' })
}

export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
