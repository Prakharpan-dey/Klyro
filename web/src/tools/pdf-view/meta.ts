import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-view',
  code: 'PDF-37',
  title: 'View PDF',
  summary: 'Read a file without leaving the browser.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'PDF Viewer — open a PDF in your browser | Klyro',
    description:
      'Read a PDF without uploading it or installing anything. Rendering is done by your own browser, so the document never reaches a server. Free, no account.',
    about:
      'For opening a file quickly without handing it to a viewer that phones home. Pages are rendered in this tab by pdf.js and nothing is stored — close it and the document is gone from memory.',
  },
}
