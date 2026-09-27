import { IMAGE_ACCEPT, PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-ocr',
  code: 'PDF-48',
  title: 'Make Searchable',
  summary: 'Read the words in a scan and layer them back on.',
  category: 'pdf',
  group: 'Convert',
  accept: [...PDF_ACCEPT, ...IMAGE_ACCEPT],
  multiple: true,
  seo: {
    title: 'OCR a PDF — make a scan searchable | Klyro',
    description:
      'Read the words in a scan and layer them back on, so the PDF becomes searchable. OCR runs in your browser with Tesseract. English and Hindi. No upload.',
    about:
      'A scan is a picture of words, so nothing can search, copy or read it aloud. This reads the picture and puts the words back as an invisible layer, leaving the page looking exactly as it did. The engine and its language data are served from this site rather than a CDN, so the scan stays here.',
  },
}
