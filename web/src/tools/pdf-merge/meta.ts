import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-merge',
  code: 'PDF-01',
  title: 'Merge',
  summary: 'Drag to reorder before joining.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Merge PDF — free, in your browser | Klyro',
    description:
      'Combine PDF files without uploading them. Merging happens in your browser and a counter on the page shows zero bytes sent. No account, no install.',
    about:
      'Reach for this when a form wants one file and you have four. Drag the pages into the order you want, then join them. The documents are read into this tab and written back out here, so a contract or a bank statement never travels to a server. Bookmarks and form fields from the sources are not carried over.',
  },
}
