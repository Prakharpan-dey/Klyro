import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-for-ai',
  code: 'PDF-31',
  title: 'PDF for AI',
  summary: 'Chunked markdown ready to paste into a chat.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
}
