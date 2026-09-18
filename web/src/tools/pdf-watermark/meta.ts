import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-watermark',
  code: 'PDF-13',
  title: 'Add Watermark',
  summary: 'Stamp DRAFT or COPY across the pages.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
}
