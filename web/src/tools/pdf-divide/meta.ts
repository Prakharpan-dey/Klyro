import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-divide',
  code: 'PDF-28',
  title: 'Divide Pages',
  summary: 'Split each page in half or into quarters.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Split PDF Pages in Half — free | Klyro',
    description:
      'Cut each page of a PDF vertically, horizontally or into quarters. Useful for two-page scans of a book. Runs in your browser with nothing uploaded.',
    about:
      'The fix for a book scanned two pages at a time, or a sheet holding several tickets. Each page is divided where you say and the pieces become pages of their own, in reading order. All of it happens on your machine.',
  },
}
