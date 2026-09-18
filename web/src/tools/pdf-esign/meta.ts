import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-esign',
  code: 'PDF-16',
  title: 'Sign PDF',
  summary: 'Draw your signature and place it on a page.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: false,
}
