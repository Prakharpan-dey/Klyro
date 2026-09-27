import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-repair',
  code: 'PDF-41',
  title: 'Repair',
  summary: 'Rebuild a file that will not open.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Repair a Damaged PDF — free, no upload | Klyro',
    description:
      'Rebuild a PDF that will not open, using qpdf in your browser. Nothing is uploaded. Free, and you get a clear error rather than a broken file if it cannot.',
    about:
      'For a download that stopped halfway, a file a portal refuses, or a PDF that one reader opens and another does not. The document is parsed and written out fresh with a clean structure. It cannot invent missing pages — if too much is gone, it says so.',
  },
}
