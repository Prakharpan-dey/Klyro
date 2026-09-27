import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-remove-annotations',
  code: 'PDF-19',
  title: 'Remove Annotations',
  summary: 'Strip comments, highlights and links.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Remove Comments from a PDF — free | Klyro',
    description:
      'Strip comments, highlights, sticky notes and link annotations from a PDF, in your browser. Nothing is uploaded. Free, and the annotations are truly removed.',
    about:
      'Review markup should rarely travel with the final document, and hiding it in a viewer does not remove it. This strips the annotation layer out of the file entirely, so the comments, highlights and sticky notes cannot be turned back on by whoever opens it next. Links are removed too, which matters when they point somewhere internal.',
  },
}
