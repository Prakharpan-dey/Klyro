import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-remove-blank',
  code: 'PDF-36',
  title: 'Remove Blank Pages',
  summary: 'Drop the empty sheets a scanner added.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
