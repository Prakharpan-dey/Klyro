import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-metadata-edit',
  code: 'PDF-18',
  title: 'Edit Metadata',
  summary: 'Set or clear the title, author and more.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Edit PDF Metadata — title, author | Klyro',
    description:
      'Set or clear the title, author, subject and keywords stored in a PDF. Runs in your browser with no upload, so the document stays on your own machine.',
    about:
      "For correcting a document that still carries a template's author, or clearing fields before sending a file outside your organisation. Set the values you want or empty them entirely — the changes are written into the file here in the tab.",
  },
}
