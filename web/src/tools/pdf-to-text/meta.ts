import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-text',
  code: 'PDF-30',
  title: 'PDF → Text',
  summary: 'Pull the words out as a text file.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
}
