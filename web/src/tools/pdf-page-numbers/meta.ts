import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-page-numbers',
  code: 'PDF-12',
  title: 'Add Page Numbers',
  summary: 'Number every page, your format and corner.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Add Page Numbers to a PDF — free | Klyro',
    description:
      'Number every page in the format and corner you choose, with pages to skip. Runs in your browser. Nothing is uploaded, and the numbers are written in.',
    about:
      'For a document that will be printed, referenced or filed. Choose the corner, the starting number and a format such as Page 3 of 40, and skip the cover if it should not carry one. The numbers become part of the file rather than a viewer setting.',
  },
}
