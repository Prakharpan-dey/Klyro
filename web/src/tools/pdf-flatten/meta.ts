import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-flatten',
  code: 'PDF-20',
  title: 'Flatten PDF',
  summary: 'Bake form values in so they cannot change.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Flatten a PDF — lock form fields | Klyro',
    description:
      'Bake form values and annotations into the page so they cannot be changed. Runs in your browser with no upload. Free, and the result opens anywhere.',
    about:
      'Do this after filling a form that has to be submitted as a record. The values stop being editable fields and become part of the page, which also fixes forms that display differently depending on the reader.',
  },
}
