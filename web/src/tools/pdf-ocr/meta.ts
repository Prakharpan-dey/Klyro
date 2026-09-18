import { IMAGE_ACCEPT, PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-ocr',
  code: 'PDF-48',
  title: 'Make Searchable',
  summary: 'Read the words in a scan and layer them back on.',
  category: 'pdf',
  group: 'Convert',
  accept: [...PDF_ACCEPT, ...IMAGE_ACCEPT],
  multiple: true,
}
