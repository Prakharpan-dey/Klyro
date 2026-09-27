import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'text-to-pdf',
  code: 'PDF-23',
  title: 'Text → PDF',
  summary: 'Paste or drop text and get a tidy PDF.',
  category: 'pdf',
  group: 'Convert',
  accept: ['text/plain', 'text/markdown', 'text/csv'],
  multiple: false,
  seo: {
    title: 'Text to PDF — paste and download | Klyro',
    description:
      'Paste or drop text and get a tidy PDF back. Page size, font and margins are yours to set. Generated in your browser, so the text is never transmitted.',
    about:
      'For notes, a letter, or a block of text that has to arrive as a PDF. Paste it in, choose A4 or Letter and a typeface, and the text is wrapped and laid out into pages. Because the PDF is built in this tab, whatever you paste — however private — stays on your machine.',
  },
}
