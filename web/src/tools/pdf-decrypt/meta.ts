import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-decrypt',
  code: 'PDF-40',
  title: 'Decrypt',
  summary: 'Remove a password you already know.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
}
