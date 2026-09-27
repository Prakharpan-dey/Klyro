import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-read-aloud',
  code: 'PDF-32',
  title: 'Read Aloud',
  summary: 'Listen to a document while you do something else.',
  category: 'pdf',
  group: 'Inspect',
  accept: PDF_ACCEPT,
  multiple: false,
  seo: {
    title: 'Read a PDF Aloud — free, no upload | Klyro',
    description:
      'Listen to a PDF while you do something else. The text is extracted in your browser and spoken by your own device. Nothing is uploaded to a voice service.',
    about:
      'Useful for proofreading, or for getting through a long document while your hands are busy. The words are pulled out here and read by the speech voices already on your machine, so neither the document nor its text is sent to a cloud service.',
  },
}
