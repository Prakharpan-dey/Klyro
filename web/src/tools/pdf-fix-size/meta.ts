import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-fix-size',
  code: 'PDF-25',
  title: 'Fix Page Size',
  summary: 'Put mixed pages onto one paper size.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Resize PDF Pages to One Size | Klyro',
    description:
      'Put mixed page sizes onto one uniform paper size, centred, in your browser. Stops a printer choking on a document assembled from different sources.',
    about:
      'Documents built from several sources often mix A4, Letter and odd scan sizes, which printers handle badly. Every page is redrawn centred on the size you choose, with a margin you set. Nothing is uploaded and nothing is cropped.',
  },
}
