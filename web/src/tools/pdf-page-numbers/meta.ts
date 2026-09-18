import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-page-numbers',
  code: 'PDF-12',
  title: 'Add Page Numbers',
  summary: 'Number every page, your format and corner.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
}
