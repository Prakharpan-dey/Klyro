import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-flatten',
  code: 'PDF-20',
  title: 'Flatten PDF',
  summary: 'Bake form values in so they cannot change.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
}
