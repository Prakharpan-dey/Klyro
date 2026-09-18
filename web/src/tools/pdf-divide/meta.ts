import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-divide',
  code: 'PDF-28',
  title: 'Divide Pages',
  summary: 'Split each page in half or into quarters.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
