import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'scan-to-pdf',
  code: 'PDF-38',
  title: 'Scan to PDF',
  summary: 'Photograph pages with your camera.',
  category: 'pdf',
  group: 'Convert',
  accept: ['image/jpeg', 'image/png', 'image/webp'],
  multiple: true,
}
