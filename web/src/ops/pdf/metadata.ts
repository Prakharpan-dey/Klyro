import type { PDFDocument } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'

export interface PdfMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  created?: string
  modified?: string
}

export interface PdfReport extends PdfMetadata {
  pages: number
  /** distinct page sizes in millimetres, e.g. "210 x 297 mm" */
  pageSizes: string[]
  encrypted: boolean
}

const asText = (value: string | undefined) => (value && value.trim() ? value.trim() : undefined)
const asDate = (value: Date | undefined) => (value ? value.toISOString().slice(0, 10) : undefined)

function sizeLabel(width: number, height: number) {
  const mm = (pt: number) => Math.round((pt * 25.4) / 72)
  return `${mm(width)} x ${mm(height)} mm`
}

export function readMetadata(doc: PDFDocument): PdfReport {
  const sizes = new Set(doc.getPages().map((p) => sizeLabel(p.getWidth(), p.getHeight())))
  return {
    title: asText(doc.getTitle()),
    author: asText(doc.getAuthor()),
    subject: asText(doc.getSubject()),
    keywords: asText(doc.getKeywords()),
    creator: asText(doc.getCreator()),
    producer: asText(doc.getProducer()),
    created: asDate(doc.getCreationDate()),
    modified: asDate(doc.getModificationDate()),
    pages: doc.getPageCount(),
    pageSizes: [...sizes],
    encrypted: doc.isEncrypted,
  }
}

export async function inspectPdf(file: File): Promise<PdfReport> {
  return readMetadata(await loadPdf(file))
}

/** Writes the given fields; empty strings clear them. */
export async function writeMetadata(file: File, fields: PdfMetadata): Promise<OutputFile> {
  const doc = await loadPdf(file)
  doc.setTitle(fields.title ?? '')
  doc.setAuthor(fields.author ?? '')
  doc.setSubject(fields.subject ?? '')
  doc.setKeywords(fields.keywords ? fields.keywords.split(',').map((k) => k.trim()) : [])
  doc.setCreator(fields.creator ?? '')
  doc.setProducer(fields.producer ?? '')
  doc.setModificationDate(new Date())

  return {
    file: await savePdf(doc, `${baseName(file.name)}-metadata.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${doc.getPageCount()} pp`,
  }
}

/** Empties every document information field and drops the XMP metadata stream. */
export async function clearMetadata(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFName } = await pdfLib()
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setCreator('')
  doc.setProducer('')
  doc.catalog.delete(PDFName.of('Metadata'))

  return {
    file: await savePdf(doc, `${baseName(file.name)}-clean.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: 'metadata cleared',
  }
}

export function metadataToText(report: PdfReport, fileName: string): string {
  const rows: [string, string | undefined][] = [
    ['File', fileName],
    ['Pages', String(report.pages)],
    ['Page sizes', report.pageSizes.join(', ')],
    ['Title', report.title],
    ['Author', report.author],
    ['Subject', report.subject],
    ['Keywords', report.keywords],
    ['Creator', report.creator],
    ['Producer', report.producer],
    ['Created', report.created],
    ['Modified', report.modified],
  ]
  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}
