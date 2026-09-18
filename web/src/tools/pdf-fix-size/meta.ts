import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-fix-size',
  code: 'PDF-25',
  title: 'Fix Page Size',
  summary: 'Put mixed pages onto one paper size.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
