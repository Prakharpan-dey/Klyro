import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-metadata-edit',
  code: 'PDF-18',
  title: 'Edit Metadata',
  summary: 'Set or clear the title, author and more.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
}
