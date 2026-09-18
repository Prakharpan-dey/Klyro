import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-reverse',
  code: 'PDF-09',
  title: 'Reverse Pages',
  summary: 'Flip the page order end to end.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
