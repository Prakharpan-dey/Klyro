import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'images-to-pdf',
  code: 'PDF-04',
  title: 'Images → PDF',
  summary: 'Turn photos and scans into one PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'JPG to PDF — combine photos free | Klyro',
    description:
      'Turn photos and scans into a single PDF without uploading them. Choose page size, orientation and margins. Runs in your browser. Free, no account.',
    about:
      'The usual case is a phone photo of a document that has to be submitted as a PDF. Drop the images in, set A4 or Letter, and they become pages in the order you arranged them. Because the photos are read in this tab, holiday pictures and ID scans alike stay on your machine.',
  },
}
