import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-alternate-mix',
  code: 'PDF-11',
  title: 'Alternate & Mix',
  summary: 'Interleave two scans of fronts and backs.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
