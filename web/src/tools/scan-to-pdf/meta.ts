import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'scan-to-pdf',
  code: 'PDF-38',
  title: 'Scan to PDF',
  summary: 'Photograph pages with your camera.',
  category: 'pdf',
  group: 'Convert',
  accept: ['image/jpeg', 'image/png', 'image/webp'],
  multiple: true,
  seo: {
    title: 'Scan to PDF with your phone camera | Klyro',
    description:
      'Photograph pages with your camera and get a PDF, without anything being uploaded. The camera stream stays in the tab and nothing is recorded or sent.',
    about:
      'For when you have a paper document and need a PDF now. The camera starts when you press start and stops when you leave the page. Frames go straight into a PDF in this tab — nothing is recorded, nothing is stored, and no frame is sent anywhere. Dropping existing photos in works too.',
  },
}
