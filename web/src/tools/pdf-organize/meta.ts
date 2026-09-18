import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-organize',
  code: 'PDF-03',
  title: 'Organize',
  summary: 'Rotate, delete and sort pages.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: false,
}
