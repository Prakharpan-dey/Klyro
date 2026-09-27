import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-encrypt',
  code: 'PDF-39',
  title: 'Encrypt',
  summary: 'Lock a PDF with a password.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Password Protect a PDF — no upload | Klyro',
    description:
      'Lock a PDF with a password in your browser. The file and the password are never sent anywhere, because the encryption runs on your own machine with qpdf.',
    about:
      'Worth doing before emailing anything with a number on it. The document is encrypted here in the tab using qpdf compiled to WebAssembly, so neither the file nor the password you choose is transmitted. Deliberately kept out of the command bar, which would put a password in a sentence.',
  },
}
