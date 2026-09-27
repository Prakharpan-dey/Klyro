import { HTML_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'html-to-pdf',
  code: 'PDF-56',
  title: 'HTML → PDF',
  summary: 'Turn a saved web page into a document.',
  category: 'pdf',
  group: 'Convert',
  accept: HTML_ACCEPT,
  multiple: true,
  seo: {
    title: 'HTML to PDF — free, in your browser | Klyro',
    description:
      'Turn a saved web page into a plain, readable PDF. The markup is read on your own machine, and nothing in the page is allowed to phone home.',
    about:
      'Use this for an invoice, a receipt or an article you saved as HTML and now need as a document. Headings, paragraphs, lists and quotes come through as clean text on the page size you choose. The original styling does not: this reads the markup rather than rendering it, which also means nothing in the file gets a chance to load a tracker or an image from a server.',
  },
}
