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
}
