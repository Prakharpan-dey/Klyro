import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-check-signature',
  code: 'PDF-47',
  title: 'Check Signature',
  summary: 'See who signed a PDF and whether it changed.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Verify a PDF Signature — free | Klyro',
    description:
      'See who signed a PDF and whether it has been altered since. Verification runs in your browser, so the document you are checking is never uploaded.',
    about:
      'For a contract or certificate that arrived signed. This reads the signature, shows who it names, and reports whether the bytes still match what was signed. A document that changed after signing will fail here, which is the whole point of checking.',
  },
}
