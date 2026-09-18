import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-delete-pages',
  code: 'PDF-07',
  title: 'Delete Pages',
  summary: 'Drop the pages you name and keep the rest.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
