import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-encrypt',
  code: 'PDF-39',
  title: 'Encrypt',
  summary: 'Lock a PDF with a password.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
}
