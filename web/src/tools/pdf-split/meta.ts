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
}
