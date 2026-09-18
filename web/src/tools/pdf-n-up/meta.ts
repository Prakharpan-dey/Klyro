import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-n-up',
  code: 'PDF-26',
  title: 'Pages per Sheet',
  summary: 'Print 2, 4, 6 or 9 pages per sheet.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
