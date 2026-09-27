import { ZIP_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'zip-to-pdf',
  code: 'PDF-55',
  title: 'ZIP → PDF',
  summary: 'Page through an archive of scans in order.',
  category: 'pdf',
  group: 'Convert',
  accept: ZIP_ACCEPT,
  multiple: false,
  seo: {
    title: 'ZIP to PDF — free, in your browser | Klyro',
    description:
      'Turn an archive of scans or images into a single PDF. Files are ordered the way you named them, and the archive is opened on your machine, never uploaded.',
    about:
      'Someone sends forty scans in one archive and you need them as a single document. This opens the zip, takes every image and PDF inside, and puts them together in the order their names sort, so page2 comes before page10 rather than after it. Anything that is not an image or a PDF is skipped rather than refused.',
  },
}
