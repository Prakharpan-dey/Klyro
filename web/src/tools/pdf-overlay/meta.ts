import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-overlay',
  code: 'PDF-29',
  title: 'Overlay',
  summary: 'Lay one PDF over another, like letterhead.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Overlay Two PDFs — letterhead, stamps | Klyro',
    description:
      'Lay one PDF over another, like printing onto letterhead. Set opacity and scale. Runs in your browser, so neither document is uploaded. Free, no account.',
    about:
      'For putting a document onto headed paper, or laying a stamp across a set of pages. Give the base file and the one to lay over it, then choose whether the overlay repeats on every page or pairs page by page.',
  },
}
