import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-redact',
  code: 'PDF-49',
  title: 'Redact',
  summary: 'Cover text and take it out of the file.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Redact a PDF — text removed, not hidden | Klyro',
    description:
      'Black out names, addresses or account numbers and remove them from the file for good. Runs in your browser, so the document is never uploaded anywhere.',
    about:
      'Use this before sending a contract, a bank statement or a medical form to someone who should not see every part of it. Draw over anything, or search for a name and cover every occurrence at once. The pages you redact are rebuilt from an image, so the hidden words are gone from the file rather than sitting underneath a black rectangle where anyone can copy them out.',
  },
}
