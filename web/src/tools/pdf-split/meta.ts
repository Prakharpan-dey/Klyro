import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-split',
  code: 'PDF-02',
  title: 'Split',
  summary: 'By ranges, every N pages, or pull out pages.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Split PDF — free, no upload | Klyro',
    description:
      'Split a PDF by page ranges, every N pages, or pull out the pages you name. Runs in your browser, so the file never leaves your machine. Free, unlimited.',
    about:
      'Useful when only part of a document should be shared: a single chapter, one invoice out of a batch, the pages a portal actually asked for. Give ranges like 1-3, 8- and each becomes its own file. Everything happens in this tab, so the pages you are not sharing are never uploaded either.',
  },
}
