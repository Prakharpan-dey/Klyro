import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-privacy-check',
  code: 'PDF-22',
  title: 'Privacy Check',
  summary: 'Find hidden data, then strip it out.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Remove Hidden Data from a PDF | Klyro',
    description:
      'Find the metadata, scripts, attachments and earlier revisions hiding in a PDF, strip them, then see the proof that the bytes are actually gone. No upload.',
    about:
      'Most tools remove hidden data by unlinking it, which leaves the bytes in the file for anyone who looks. This rebuilds the document from what is still reachable, then searches its own output for the exact values the original held and shows you the result. It shows the check, not just the claim.',
  },
}
