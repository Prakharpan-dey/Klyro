import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-to-docx',
  code: 'PDF-43',
  title: 'PDF → Word',
  summary: 'Editable text in a .docx file.',
  category: 'pdf',
  group: 'Convert',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'PDF to Word — free, in your browser | Klyro',
    description:
      'Convert a PDF into an editable .docx without uploading it. The text is extracted in your browser and written into a Word file on your own machine. Free.',
    about:
      'Best when you need to edit wording rather than reproduce a layout. The words are pulled out of the PDF and written into a Word document you can open and change. Complex columns will not survive as tables, and a scan with no text layer gives you nothing — run OCR on it first.',
  },
}
