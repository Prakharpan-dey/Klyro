import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-excel',
  code: 'PDF-44',
  title: 'PDF → Excel',
  summary: 'Turn a printed table into a sheet.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to Excel — no upload, free | Klyro',
    description:
      'Turn a table printed in a PDF into a spreadsheet without uploading the file. Columns are detected in your browser and written to .xlsx. Free, no account.',
    about:
      'For a statement or report where the numbers are trapped in a printed table. Column positions are inferred from where the text sits on the page, so a clean grid converts well and a decorative layout does not. Check the result against the original — the tool tells you how many rows it found.',
  },
}
