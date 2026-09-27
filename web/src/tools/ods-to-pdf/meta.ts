import { ODS_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'ods-to-pdf',
  code: 'PDF-53',
  title: 'ODS → PDF',
  summary: 'Print a LibreOffice sheet as a clean table.',
  category: 'pdf',
  group: 'Convert',
  accept: ODS_ACCEPT,
  multiple: true,
  seo: {
    title: 'ODS to PDF — free, in your browser | Klyro',
    description:
      'Turn an OpenDocument spreadsheet into a clean printable PDF table. Headers repeat on every page, nothing is uploaded, and no account is needed.',
    about:
      'A spreadsheet emailed as .ods often cannot be opened by the person receiving it. This draws every sheet as a plain table and saves it as a PDF, with the first row repeated at the top of each page so a long table stays readable. Values are printed as they are stored, so formulas, colours and charts do not come across.',
  },
}
