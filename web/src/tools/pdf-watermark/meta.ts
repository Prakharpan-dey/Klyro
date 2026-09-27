import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-watermark',
  code: 'PDF-13',
  title: 'Add Watermark',
  summary: 'Stamp DRAFT or COPY across the pages.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Add a Watermark to a PDF — free | Klyro',
    description:
      'Stamp DRAFT, CONFIDENTIAL or your own text across every page, at an angle and opacity you choose. Runs in your browser. No upload, no account needed.',
    about:
      'For circulating something that should not be mistaken for final. Set the text, the angle and how faint it should be, and it is drawn across every page — optionally tiled edge to edge so it cannot be cropped off. The stamp is part of the file afterwards.',
  },
}
