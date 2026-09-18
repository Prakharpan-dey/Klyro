import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-header-footer',
  code: 'PDF-14',
  title: 'Header & Footer',
  summary: 'Repeat a title or date on every page.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
}
