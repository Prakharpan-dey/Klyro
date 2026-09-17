import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'images-to-pdf',
  code: 'PDF-04',
  title: 'Images → PDF',
  summary: 'Turn photos and scans into one PDF.',
  category: 'pdf',
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/avif', 'image/gif'],
  multiple: true,
}
