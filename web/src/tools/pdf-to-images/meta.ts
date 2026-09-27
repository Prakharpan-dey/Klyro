import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-images',
  code: 'PDF-05',
  title: 'PDF → Images',
  summary: 'Every page as a JPG or PNG.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to JPG or PNG — free, no upload | Klyro',
    description:
      'Export every page of a PDF as a JPG or PNG at the resolution you pick. Rendering happens in your browser, so the document never leaves your machine.',
    about:
      'Handy when a page needs to go into a slide, a message, or somewhere that will not take a PDF. Choose the format and the DPI, and each page comes back as its own image. Higher DPI gives a sharper image and a larger file. All rendering is done by your own browser.',
  },
}
