import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-bates',
  code: 'PDF-15',
  title: 'Bates Numbering',
  summary: 'Sequential stamps across a set of files.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Bates Numbering for PDFs — free | Klyro',
    description:
      'Apply sequential Bates numbers across a whole set of files, continuing from one to the next. Runs in your browser, so case documents are never uploaded.',
    about:
      'Standard practice for legal discovery and records: every page gets a unique sequential stamp, with a prefix and a fixed number of digits. The count carries on across files in the order you arrange them, so a whole production can be numbered in one pass.',
  },
}
