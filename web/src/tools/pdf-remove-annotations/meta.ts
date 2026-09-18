import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-remove-annotations',
  code: 'PDF-19',
  title: 'Remove Annotations',
  summary: 'Strip comments, highlights and links.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
}
