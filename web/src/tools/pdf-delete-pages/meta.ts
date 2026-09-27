import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-delete-pages',
  code: 'PDF-07',
  title: 'Delete Pages',
  summary: 'Drop the pages you name and keep the rest.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Delete Pages from a PDF — free | Klyro',
    description:
      'Drop the pages you name and keep the rest, without uploading the file. Runs in your browser. Free, no account, and the removed pages are genuinely gone.',
    about:
      'For the cover sheet nobody needs or the blank the scanner added. Name the pages and the rest are rebuilt into a new document. Because the file is rewritten from the pages you kept, what you removed is not sitting in the output waiting to be recovered.',
  },
}
