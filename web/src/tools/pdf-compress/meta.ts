import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-compress',
  code: 'PDF-33',
  title: 'Compress',
  summary: 'Shrink a scan towards a size limit.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
