import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-fill-form',
  code: 'PDF-21',
  title: 'Fill PDF Form',
  summary: 'Type into form fields without Acrobat.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
}
