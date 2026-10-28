import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-edit',
  code: 'PDF-63',
  title: 'Edit PDF',
  summary: 'Add text, pictures, shapes and whiteout anywhere on a page.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Edit PDF — add text, images and shapes, free | Klyro',
    description:
      'Type on a PDF, add pictures, boxes, circles and lines, or white out a mistake and write over it. In your browser, so the document is never uploaded. No sign-up.',
    about:
      'Fill a form that has no fields, add a note to a contract, put a logo on a letter or cross something out. Place each item by dragging it on the page, or type its exact position, and change its font, size and colour as you go. The words already in the PDF are left as they are; to fix one, cover it with whiteout and type over it.',
  },
}
