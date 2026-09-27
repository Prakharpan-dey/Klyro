import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-for-ai',
  code: 'PDF-31',
  title: 'PDF for AI',
  summary: 'Chunked markdown ready to paste into a chat.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to Markdown for AI — free | Klyro',
    description:
      'Turn a PDF into chunked markdown ready to paste into a chat, in your browser. The document is never uploaded, which is the point when it is confidential.',
    about:
      'For feeding a document to an assistant without handing the file to yet another service on the way. The text is extracted and split on paragraph boundaries into chunks near the size you choose, so each piece fits in a message. All of it happens in this tab.',
  },
}
