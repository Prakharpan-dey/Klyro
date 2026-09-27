import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-decrypt',
  code: 'PDF-40',
  title: 'Decrypt',
  summary: 'Remove a password you already know.',
  category: 'pdf',
  group: 'Secure',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Unlock a PDF — remove a known password | Klyro',
    description:
      'Remove a password you already know from a PDF, in your browser. Nothing is uploaded, so neither the document nor the password leaves your machine. Free.',
    about:
      'For the bank statement that arrives locked and has to be filed unlocked. You need the existing password — this removes a lock you can already open, it does not break one you cannot. The work is done by qpdf inside this tab, which is why the password is safe to type here.',
  },
}
