import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-metadata',
  code: 'PDF-17',
  title: 'View Metadata',
  summary: 'See the author, dates and page sizes.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
}
