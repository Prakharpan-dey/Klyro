import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-view',
  code: 'PDF-37',
  title: 'View PDF',
  summary: 'Read a file without leaving the browser.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
}
