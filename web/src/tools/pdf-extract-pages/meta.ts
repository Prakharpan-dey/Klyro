import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-extract-pages',
  code: 'PDF-08',
  title: 'Extract Pages',
  summary: 'Pull chosen pages into a new PDF.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
