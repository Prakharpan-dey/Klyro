import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-compress',
  code: 'PDF-33',
  title: 'Compress',
  summary: 'Shrink a scan towards a size limit.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Compress PDF without uploading it | Klyro',
    description:
      'Shrink a PDF under a size limit without uploading it. Pages are re-rendered in your browser at a resolution you choose. Free, no account, works offline.',
    about:
      'For the portal that refuses anything over 500 KB. Give a target size and the pages are redrawn at a lower resolution until the file fits. Text stops being selectable, which is the trade for the smaller file, and the tool says so before it runs. A greyscale filter makes scans smaller again.',
  },
}
