import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'text-to-pdf',
  code: 'PDF-23',
  title: 'Text → PDF',
  summary: 'Paste or drop text and get a tidy PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: ['text/plain', 'text/markdown', 'text/csv'],
  multiple: false,
}
