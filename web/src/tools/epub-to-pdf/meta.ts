import { EPUB_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'epub-to-pdf',
  code: 'PDF-54',
  title: 'EPUB → PDF',
  summary: 'Lay an ebook out as a readable PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: EPUB_ACCEPT,
  multiple: true,
  seo: {
    title: 'EPUB to PDF — free, in your browser | Klyro',
    description:
      'Convert an ebook to PDF without uploading it. Chapters are read in the order the book sets and laid out on the page size you choose, entirely on your machine.',
    about:
      'An EPUB reflows to fit whatever is reading it, which is useless when you want to print a book or read it on something that only opens PDFs. This follows the reading order the book itself declares, starts each chapter on a new page, and lays the text out at the size and margins you pick. Cover art, embedded fonts and illustrations are not carried across.',
  },
}
