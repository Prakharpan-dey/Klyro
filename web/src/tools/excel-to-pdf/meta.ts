import { SHEET_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'excel-to-pdf',
  code: 'PDF-45',
  title: 'Excel → PDF',
  summary: 'Print a workbook to a clean table.',
  category: 'pdf',
  group: 'Convert',
  accept: SHEET_ACCEPT,
  multiple: true,
}
