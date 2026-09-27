import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-extract-pages',
  code: 'PDF-08',
  title: 'Extract Pages',
  summary: 'Pull chosen pages into a new PDF.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Extract Pages from a PDF — free | Klyro',
    description:
      'Pull chosen pages out of a PDF into a new file, in your browser. Nothing is uploaded, so the pages you are not extracting are never transmitted either.',
    about:
      'When someone asked for pages four to six and the document has ninety. Name what you want and a new PDF is built from just those pages. This is the safe way to share part of a file — the rest of it never goes anywhere, because none of it does.',
  },
}
