import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-text',
  code: 'PDF-30',
  title: 'PDF → Text',
  summary: 'Pull the words out as a text file.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to Text — extract words free | Klyro',
    description:
      'Pull the words out of a PDF as a plain text file, in your browser. One file or one per page. Nothing is uploaded, so the document stays on your machine.',
    about:
      'When you want the words and not the layout: quoting from a report, feeding a document into something else, or checking whether a PDF has a text layer at all. If it comes back empty the page is an image, and Make Searchable will fix that first.',
  },
}
