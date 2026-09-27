import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-booklet',
  code: 'PDF-27',
  title: 'Make a Booklet',
  summary: 'Reorder for folded, saddle-stitch printing.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Make a PDF Booklet — saddle stitch | Klyro',
    description:
      'Reorder a PDF for folded, saddle-stitch printing so the pages land in the right place when folded. Runs in your browser. No upload, no account, free.',
    about:
      'For a programme, a zine or a short guide you want to print, fold and staple down the middle. The pages are paired and sequenced so that folding the printed stack produces the right reading order. Print double-sided, flipped on the short edge.',
  },
}
