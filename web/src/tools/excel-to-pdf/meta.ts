import { SHEET_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'excel-to-pdf',
  code: 'PDF-45',
  title: 'Excel → PDF',
  summary: 'Print a workbook to a clean table.',
  category: 'pdf',
  group: 'Convert',
  accept: SHEET_ACCEPT,
  multiple: true,
  seo: {
    title: 'Excel to PDF — free, no upload | Klyro',
    description:
      'Turn an .xlsx or .csv into a clean printable PDF table, in your browser. Headers repeat on each page. Nothing is uploaded and no account is needed.',
    about:
      'For sending a sheet to someone who should read it rather than edit it. The rows are laid out as a ruled table with the header repeated on every page. Formulas are not recalculated — what was last saved in the file is what gets printed, which is usually what you want for a record.',
  },
}
