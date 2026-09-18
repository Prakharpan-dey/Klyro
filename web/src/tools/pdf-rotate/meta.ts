import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-rotate',
  code: 'PDF-06',
  title: 'Rotate',
  summary: 'Turn every page, or just the ones you pick.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
}
