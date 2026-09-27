import { RTF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'rtf-to-pdf',
  code: 'PDF-57',
  title: 'RTF → PDF',
  summary: 'Convert rich text into a tidy PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: RTF_ACCEPT,
  multiple: true,
  seo: {
    title: 'RTF to PDF — free, in your browser | Klyro',
    description:
      'Convert a Rich Text Format document to PDF without uploading it. Paragraphs, bold and italic carry across, and the file never leaves your machine.',
    about:
      'RTF turns up from older word processors, from forms and from anything that wanted a document format every system could read. It is exactly the kind of file you no longer have the software for. This reads the text, keeps bold, italic and page breaks, and lays it out again as a PDF. Tables, images and embedded objects are dropped.',
  },
}
