import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-rasterize',
  code: 'PDF-34',
  title: 'Rasterize',
  summary: 'Flatten pages into images at a chosen DPI.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Rasterize a PDF — flatten to images | Klyro',
    description:
      'Flatten every page into an image at a DPI you choose, so nothing can be selected, edited or extracted. Runs in your browser with nothing uploaded.',
    about:
      'Use it when a document should be readable but not editable, or when a file behaves differently in different readers. Each page becomes a picture at the resolution you set. Text stops being selectable, which is usually the reason for doing it.',
  },
}
