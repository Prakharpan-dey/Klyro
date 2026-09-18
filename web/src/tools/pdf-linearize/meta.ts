import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-linearize',
  code: 'PDF-42',
  title: 'Linearize',
  summary: 'Optimise for fast opening on the web.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
