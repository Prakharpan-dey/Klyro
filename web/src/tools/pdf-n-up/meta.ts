import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-n-up',
  code: 'PDF-26',
  title: 'Pages per Sheet',
  summary: 'Print 2, 4, 6 or 9 pages per sheet.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Print Multiple PDF Pages per Sheet | Klyro',
    description:
      'Put 2, 4, 6 or 9 pages onto each sheet before printing, in your browser. Saves paper on handouts and drafts. No upload, no account, free to use.',
    about:
      'The usual reason is paper: a ninety page draft prints on twenty three sheets at four up. Choose how many pages share a sheet, the paper size and the gap between them, and a new PDF is laid out ready to send to a printer.',
  },
}
