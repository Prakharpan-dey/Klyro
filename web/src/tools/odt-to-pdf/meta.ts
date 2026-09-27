import { ODT_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'odt-to-pdf',
  code: 'PDF-52',
  title: 'ODT → PDF',
  summary: 'Turn a LibreOffice document into a PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: ODT_ACCEPT,
  multiple: true,
  seo: {
    title: 'ODT to PDF — free, in your browser | Klyro',
    description:
      'Convert an OpenDocument text file to PDF without uploading it. Headings, paragraphs and lists are laid out again on your own machine, nothing is sent away.',
    about:
      'LibreOffice and OpenOffice save to .odt, which plenty of people cannot open. This turns one into a PDF anybody can read, without installing an office suite or handing the document to a website. Headings, paragraphs and bulleted lists carry across. The page design does not: this reads the text and lays it out fresh, so images, tables and columns are left behind.',
  },
}
