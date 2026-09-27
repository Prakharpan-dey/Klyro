import { DOCX_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'docx-to-pdf',
  code: 'PDF-51',
  title: 'Word → PDF',
  summary: 'Turn a .docx into a clean, readable PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: DOCX_ACCEPT,
  multiple: true,
  seo: {
    title: 'Word to PDF — free, in your browser | Klyro',
    description:
      'Convert a .docx to PDF without uploading it. The text, headings and lists are laid out fresh on your own machine, with nothing sent to a server.',
    about:
      'Use this when you need to send a document to someone who should not be able to edit it, or who may not own Word. Headings, paragraphs, lists and page breaks carry across, and the file never leaves your machine. This reads the text rather than reproducing the original page design, so images, tables and multi-column layouts are not carried over.',
  },
}
