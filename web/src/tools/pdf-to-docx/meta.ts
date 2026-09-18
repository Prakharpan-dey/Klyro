import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-docx',
  code: 'PDF-43',
  title: 'PDF → Word',
  summary: 'Editable text in a .docx file.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
}
