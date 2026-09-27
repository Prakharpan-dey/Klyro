import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-annotate',
  code: 'PDF-50',
  title: 'Highlight & Note',
  summary: 'Mark up a document without changing it.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Annotate a PDF — highlight and note | Klyro',
    description:
      'Highlight passages and add a short note to any page, in your browser. The text underneath stays selectable, and the document is never uploaded.',
    about:
      'Use this to mark the clause that matters before sending a contract on, or to leave a line of context on a page someone else has to read. Drag across anything to highlight it and the words show through, the way a marker pen behaves on paper. Marks are drawn into the page rather than added as comments, so they cannot be switched off or stripped out by whatever the other person opens it in.',
  },
}
