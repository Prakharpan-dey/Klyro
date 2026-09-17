import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-images',
  code: 'PDF-05',
  title: 'PDF → Images',
  summary: 'Every page as a JPG or PNG.',
  category: 'pdf',
  accept: ['application/pdf'],
  multiple: true,
}
