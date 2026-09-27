import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-rotate',
  code: 'PDF-06',
  title: 'Rotate',
  summary: 'Turn every page, or just the ones you pick.',
  category: 'pdf',
  group: 'Pages',
  accept: PDF_ACCEPT,
  multiple: true,
  seo: {
    title: 'Rotate PDF Pages — free, no upload | Klyro',
    description:
      'Turn every page of a PDF, or just the ones you name, by 90, 180 or 270 degrees. Runs in your browser with no upload. Free and saves the rotation properly.',
    about:
      'Scanners routinely deliver a page sideways. Rotate the whole document or name the pages that are wrong. The rotation is written into the file rather than applied by the viewer, so it survives being sent to someone else and opened somewhere different.',
  },
}
