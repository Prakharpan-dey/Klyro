import type { PDFDocument } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { readMetadata, type PdfReport } from './metadata'

export interface PrivacyFinding {
  id: 'metadata' | 'annotations' | 'forms' | 'javascript' | 'attachments' | 'xmp'
  label: string
  detail: string
  /** true when the document carries something worth removing */
  present: boolean
}

export interface PrivacyScan {
  report: PdfReport
  findings: PrivacyFinding[]
}

async function countAnnotations(doc: PDFDocument) {
  const { PDFName, PDFArray } = await pdfLib()
  return doc.getPages().reduce((total, page) => {
    const annots = page.node.get(PDFName.of('Annots'))
    return total + (annots instanceof PDFArray ? annots.size() : 0)
  }, 0)
}

async function namedEntry(doc: PDFDocument, key: 'JavaScript' | 'EmbeddedFiles') {
  const { PDFName, PDFDict } = await pdfLib()
  const names = doc.catalog.get(PDFName.of('Names'))
  if (!(names instanceof PDFDict)) return false
  return names.has(PDFName.of(key))
}

export async function scanPrivacy(file: File): Promise<PrivacyScan> {
  const doc = await loadPdf(file)
  const { PDFName } = await pdfLib()
  const report = readMetadata(doc)

  const identifying = [report.title, report.author, report.subject, report.keywords, report.creator]
  const metadataValues = identifying.filter(Boolean) as string[]
  const annotations = await countAnnotations(doc)
  const fields = doc.getForm().getFields().length
  const hasJs = await namedEntry(doc, 'JavaScript')
  const hasFiles = await namedEntry(doc, 'EmbeddedFiles')
  const hasXmp = Boolean(doc.catalog.get(PDFName.of('Metadata')))

  const findings: PrivacyFinding[] = [
    {
      id: 'metadata',
      label: 'Document information',
      detail: metadataValues.length
        ? `Carries ${metadataValues.length} field(s): ${metadataValues.join(' · ')}`
        : 'No title, author or creator recorded',
      present: metadataValues.length > 0,
    },
    {
      id: 'xmp',
      label: 'XMP metadata',
      detail: hasXmp ? 'An XMP metadata stream is attached' : 'No XMP stream',
      present: hasXmp,
    },
    {
      id: 'annotations',
      label: 'Annotations',
      detail: annotations
        ? `${annotations} annotation(s), which may include comments or links`
        : 'No annotations',
      present: annotations > 0,
    },
    {
      id: 'forms',
      label: 'Form fields',
      detail: fields ? `${fields} field(s), which may still hold entered values` : 'No form fields',
      present: fields > 0,
    },
    {
      id: 'javascript',
      label: 'JavaScript',
      detail: hasJs ? 'The document contains JavaScript' : 'No JavaScript',
      present: hasJs,
    },
    {
      id: 'attachments',
      label: 'Embedded files',
      detail: hasFiles ? 'The document has embedded file attachments' : 'No embedded files',
      present: hasFiles,
    },
  ]

  return { report, findings }
}

/** Removes everything the scan flags: metadata, annotations, form data, scripts and attachments. */
export async function stripPdf(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFName } = await pdfLib()

  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setCreator('')
  doc.setProducer('')
  doc.catalog.delete(PDFName.of('Metadata'))
  doc.catalog.delete(PDFName.of('Names'))
  doc.catalog.delete(PDFName.of('OpenAction'))
  doc.catalog.delete(PDFName.of('AA'))

  const form = doc.getForm()
  if (form.getFields().length) {
    try {
      form.flatten()
    } catch {
      // a malformed form can refuse to flatten; dropping AcroForm still removes the values
      doc.catalog.delete(PDFName.of('AcroForm'))
    }
  }
  doc.getPages().forEach((page) => page.node.delete(PDFName.of('Annots')))

  return {
    file: await savePdf(doc, `${baseName(file.name)}-stripped.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${doc.getPageCount()} pp`,
  }
}

export async function removeAnnotations(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFName } = await pdfLib()
  doc.getPages().forEach((page) => page.node.delete(PDFName.of('Annots')))
  return {
    file: await savePdf(doc, `${baseName(file.name)}-no-annotations.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${doc.getPageCount()} pp`,
  }
}
