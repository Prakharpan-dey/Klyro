import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-fill-form',
  code: 'PDF-21',
  title: 'Fill PDF Form',
  summary: 'Type into form fields without Acrobat.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Fill a PDF Form without Acrobat | Klyro',
    description:
      'Type into PDF form fields in your browser, with no Acrobat and no upload. Free, and the values you enter never leave the tab you typed them into.',
    about:
      'Government and bank forms are usually fillable PDFs that most free readers will not let you edit. This lists every field and lets you type into them. Since the form is filled here, the details you enter are not sent anywhere. Flatten it afterwards to lock the values in.',
  },
}
