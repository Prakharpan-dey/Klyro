import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-sign-certificate',
  code: 'PDF-46',
  title: 'Digital Signature',
  summary: 'Sign with a certificate so edits show up.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Digitally Sign a PDF with a Certificate | Klyro',
    description:
      'Sign a PDF with a certificate so any later edit is detectable. Signing runs in your browser, so neither the document nor your private key is uploaded.',
    about:
      'The cryptographic kind of signature, not a drawn one: the file is signed so a reader can tell whether it changed afterwards. Your key stays on your machine because the signing happens here — which is the only way handling a private key in a browser is defensible.',
  },
}
