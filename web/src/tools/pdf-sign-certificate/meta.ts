import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-sign-certificate',
  code: 'PDF-46',
  title: 'Digital Signature',
  summary: 'Sign with a certificate so edits show up.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
}
