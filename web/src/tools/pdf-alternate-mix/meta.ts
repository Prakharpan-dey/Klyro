import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-alternate-mix',
  code: 'PDF-11',
  title: 'Alternate & Mix',
  summary: 'Interleave two scans of fronts and backs.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Merge Front and Back Scans — free | Klyro',
    description:
      'Interleave two PDFs of fronts and backs into one correctly ordered document, in your browser. Reverse the second file for a stack fed backwards. No upload.',
    about:
      'For a sheet-fed scanner with no duplex: you scan all the fronts, flip the stack, scan all the backs, and end up with two files in the wrong order. This weaves them together, and can read the second one backwards for a stack that went through reversed.',
  },
}
