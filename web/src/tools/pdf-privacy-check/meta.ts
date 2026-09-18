import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-privacy-check',
  code: 'PDF-22',
  title: 'Privacy Check',
  summary: 'Find hidden data, then strip it out.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: false,
}
