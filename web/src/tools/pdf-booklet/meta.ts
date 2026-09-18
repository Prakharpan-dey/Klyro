import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-booklet',
  code: 'PDF-27',
  title: 'Make a Booklet',
  summary: 'Reorder for folded, saddle-stitch printing.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
