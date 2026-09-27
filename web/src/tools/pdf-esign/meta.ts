import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-esign',
  code: 'PDF-16',
  title: 'Sign PDF',
  summary: 'Draw your signature and place it on a page.',
  category: 'pdf',
  group: 'Stamps',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Sign a PDF — draw or upload a signature | Klyro',
    description:
      'Add your signature to a PDF and place it anywhere on the page. Draw it, type it or upload an image. Everything happens in your browser, with no upload.',
    about:
      'For the contract that needs signing and sending back today. Draw with a mouse or finger, type your name in a script face, or upload a photo of a real signature. Drag it where it belongs and resize it. This is a visible mark, not a cryptographic one — use Digital Signature for that.',
  },
}
