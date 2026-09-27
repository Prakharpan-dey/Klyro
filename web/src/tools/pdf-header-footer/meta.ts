import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-header-footer',
  code: 'PDF-14',
  title: 'Header & Footer',
  summary: 'Repeat a title or date on every page.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Add a Header or Footer to a PDF | Klyro',
    description:
      'Repeat a title, date or reference on every page of a PDF, in your browser. Placeholders for page and total. Nothing uploaded, no account, free to use.',
    about:
      'For a report that should carry its title on every page, or a draft that needs a date in the corner. The text repeats on every page and can include the page number and total. Written into the document, so it survives being sent on.',
  },
}
