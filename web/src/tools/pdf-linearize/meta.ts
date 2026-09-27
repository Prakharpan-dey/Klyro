import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-linearize',
  code: 'PDF-42',
  title: 'Linearize',
  summary: 'Optimise for fast opening on the web.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Linearize a PDF for fast web viewing | Klyro',
    description:
      'Restructure a PDF so the first page displays before the whole file has downloaded. Runs in your browser with qpdf. No upload, no account, free.',
    about:
      'Worth doing for anything you are putting on a website. The internal structure is rearranged so a reader can show page one while the rest is still arriving, which makes a large document feel far quicker to open.',
  },
}
