import { CSV_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'csv-to-pdf',
  code: 'PDF-58',
  title: 'CSV → PDF',
  summary: 'Print a CSV export as a ruled table.',
  category: 'pdf',
  group: 'Convert',
  accept: CSV_ACCEPT,
  multiple: true,
  seo: {
    title: 'CSV to PDF — free, in your browser | Klyro',
    description:
      'Turn a CSV export into a clean, printable PDF table. Commas, semicolons and tabs are detected for you, and the file never leaves your machine.',
    about:
      'Bank exports, attendance lists and anything pulled out of a database usually arrive as CSV, which prints as an unreadable wall of commas. This lays the rows out as a ruled table with the header repeated on every page. Quoted fields, line breaks inside cells and European semicolon exports are all read correctly, and IDs such as 00123 keep their leading zeros.',
  },
}
