import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-bates',
  code: 'PDF-15',
  title: 'Bates Numbering',
  summary: 'Sequential stamps across a set of files.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
}
