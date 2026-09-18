import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-excel',
  code: 'PDF-44',
  title: 'PDF → Excel',
  summary: 'Turn a printed table into a sheet.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
}
