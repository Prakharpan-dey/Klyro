import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'images-to-pdf',
  code: 'PDF-04',
  title: 'Images → PDF',
  summary: 'Turn photos and scans into one PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: IMAGE_ACCEPT,
  multiple: true,
}
