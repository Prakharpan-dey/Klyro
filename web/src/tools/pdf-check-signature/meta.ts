import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-check-signature',
  code: 'PDF-47',
  title: 'Check Signature',
  summary: 'See who signed a PDF and whether it changed.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: false,
}
