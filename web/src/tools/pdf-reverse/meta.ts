import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-reverse',
  code: 'PDF-09',
  title: 'Reverse Pages',
  summary: 'Flip the page order end to end.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Reverse PDF Page Order — free | Klyro',
    description:
      'Flip a PDF end to end so the last page becomes the first. Runs in your browser with nothing uploaded. Free, instant, and no account is needed.',
    about:
      'Mostly used after a scanner has fed a stack the wrong way round. One step, no settings: the page order is inverted and the file rebuilt. Like every tool here, the document is read and written inside this tab.',
  },
}
