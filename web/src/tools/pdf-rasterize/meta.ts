import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-rasterize',
  code: 'PDF-34',
  title: 'Rasterize',
  summary: 'Flatten pages into images at a chosen DPI.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
}
