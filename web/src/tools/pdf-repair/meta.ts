import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-repair',
  code: 'PDF-41',
  title: 'Repair',
  summary: 'Rebuild a file that will not open.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
