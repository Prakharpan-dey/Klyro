import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-compare',
  code: 'PDF-61',
  title: 'Compare',
  summary: 'See exactly what changed between two versions.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Compare Two PDFs — find every change | Klyro',
    description:
      'Compare two versions of a PDF and see every changed line, plus a red overlay of what moved on the page. Runs in your browser; neither file is uploaded.',
    about:
      'Use it when a contract comes back "with a few small edits", or to check what a new version of a form actually changed. You get a report listing every line added or removed, page by page, and an overlay of the new version with each difference painted red, which also catches changes that are not words: a moved signature, a new logo, an altered figure in a scan.',
  },
}
