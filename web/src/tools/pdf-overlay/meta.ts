import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-overlay',
  code: 'PDF-29',
  title: 'Overlay',
  summary: 'Lay one PDF over another, like letterhead.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
