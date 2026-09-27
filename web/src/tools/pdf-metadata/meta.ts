import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-metadata',
  code: 'PDF-17',
  title: 'View Metadata',
  summary: 'See the author, dates and page sizes.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'View PDF Metadata — author, dates | Klyro',
    description:
      'See the author, producer, creation and modification dates and page sizes stored inside a PDF. Read in your browser, so the document is never uploaded.',
    about:
      'Every PDF carries more than it shows: who made it, with what software, and when. This lists what is actually in the file. Worth checking before sending a document on, and Privacy Check will remove what you find.',
  },
}
