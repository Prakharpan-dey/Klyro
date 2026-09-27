import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-color-filters',
  code: 'PDF-35',
  title: 'Colour Filters',
  summary: 'Greyscale, invert or boost contrast.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to Greyscale — or invert, free | Klyro',
    description:
      'Convert a PDF to greyscale, invert it for dark reading, or boost contrast on a faint scan. Runs in your browser. Nothing is uploaded, no account needed.',
    about:
      'Greyscale makes a colour document much smaller and cheaper to print. Inverting helps for reading at night, and the contrast filter rescues a pale scan. The filter is applied as the pages are redrawn here in the tab.',
  },
}
