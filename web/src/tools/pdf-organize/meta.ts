import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-organize',
  code: 'PDF-03',
  title: 'Organize',
  summary: 'Rotate, delete and sort pages.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Organize PDF Pages — reorder and rotate | Klyro',
    description:
      'Rotate, delete and reorder pages on one screen, in your browser. Drag thumbnails into place. Nothing is uploaded and the result is rebuilt on your machine.',
    about:
      'The visual way to fix a document: see every page as a thumbnail, drag them into order, turn the sideways ones, drop the ones that should not be there. All the edits are applied at once when you save, and the whole thing happens in this tab.',
  },
}
