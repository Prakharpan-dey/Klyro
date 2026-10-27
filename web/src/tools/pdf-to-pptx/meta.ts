import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-pptx',
  code: 'PDF-59',
  title: 'PDF → PowerPoint',
  summary: 'One slide per page, text in the notes.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to PowerPoint — free, in your browser | Klyro',
    description:
      'Turn every page of a PDF into a PowerPoint slide, with its text in the speaker notes. Converted on your own machine, so the file is never uploaded.',
    about:
      'Use this when someone sends a deck as a PDF and you need to present it, reorder it or add slides of your own. Each page becomes a slide that looks exactly like the original, and the words from that page go into the speaker notes where they can still be copied. The slides are pictures of the pages, so the text on them cannot be edited.',
  },
}
