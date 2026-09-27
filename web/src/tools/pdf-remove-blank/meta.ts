import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-remove-blank',
  code: 'PDF-36',
  title: 'Remove Blank Pages',
  summary: 'Drop the empty sheets a scanner added.',
  category: 'pdf',
  group: 'Optimise',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Remove Blank Pages from a PDF — free | Klyro',
    description:
      'Drop the empty sheets a scanner added, using an ink threshold you control. Runs in your browser with no upload. Free, and you see what will be removed.',
    about:
      'Sheet-fed scanners add a blank for every unprinted back. Each page is measured for how much ink it carries and the ones below your threshold are dropped. The threshold matters — a page with one faint line is nearly blank, so you get to set where the line falls.',
  },
}
