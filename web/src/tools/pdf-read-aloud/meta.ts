import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-read-aloud',
  code: 'PDF-32',
  title: 'Read Aloud',
  summary: 'Listen to a document while you do something else.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
}
