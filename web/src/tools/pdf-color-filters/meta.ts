import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-color-filters',
  code: 'PDF-35',
  title: 'Colour Filters',
  summary: 'Greyscale, invert or boost contrast.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
