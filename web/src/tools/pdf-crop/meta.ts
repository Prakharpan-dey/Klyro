import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-crop',
  code: 'PDF-24',
  title: 'Crop',
  summary: 'Trim margins away from every page.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Crop a PDF — trim margins free | Klyro',
    description:
      'Trim margins away from every page of a PDF, in millimetres, in your browser. Nothing is uploaded. Free, and the original page content is left untouched.',
    about:
      'For scans with a wide border, or a page that needs to fit a smaller frame. Give the margin to cut from each edge and the visible area is reduced. The content is not resampled, so nothing loses quality — the page is simply shown smaller.',
  },
}
