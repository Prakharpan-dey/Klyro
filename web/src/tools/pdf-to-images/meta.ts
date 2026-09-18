import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-images',
  code: 'PDF-05',
  title: 'PDF → Images',
  summary: 'Every page as a JPG or PNG.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
}
