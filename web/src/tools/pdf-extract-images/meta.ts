import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-extract-images',
  code: 'PDF-62',
  title: 'Extract Images',
  summary: 'Pull the photos and graphics out of a PDF, at their own quality.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Extract Images from PDF — original quality, free | Klyro',
    description:
      'Save every photo and graphic inside a PDF as its own file, at the resolution it was put in. JPEG photos come out byte for byte. In your browser, no upload.',
    about:
      'Different from saving pages as pictures: this takes out the images the PDF holds, at their own size, with the text and layout left behind. JPEG photos are copied out exactly as they were stored, so nothing is re-compressed. Other images, logos and transparent graphics come out as PNG. A logo repeated on every page is saved once.',
  },
}
