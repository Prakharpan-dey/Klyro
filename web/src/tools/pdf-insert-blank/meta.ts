import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-insert-blank',
  code: 'PDF-10',
  title: 'Insert Blank Pages',
  summary: 'Add empty pages for printing or notes.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Insert Blank Pages into a PDF — free | Klyro',
    description:
      'Add empty pages before or after the pages you name, for printing or notes. Runs in your browser with no upload. Match the neighbouring size, or force A4.',
    about:
      'Useful for double-sided printing where a section has to start on a right-hand page, or for leaving room to write. Say where the blanks go and how many, and they are inserted at the size of the page they attach to unless you pick one.',
  },
}
