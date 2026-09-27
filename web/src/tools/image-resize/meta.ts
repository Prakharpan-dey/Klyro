import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-resize',
  code: 'IMG-02',
  title: 'Resize',
  summary: 'px, percent or cm at a chosen DPI.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Resize an Image — px, percent or cm | Klyro',
    description:
      'Resize photos by pixels, percentage or physical size at a chosen DPI. Runs in your browser through Web Workers, so nothing is uploaded and nothing waits.',
    about:
      'Use it when a form asks for an exact pixel size, or a print needs a physical one. Centimetres at a stated DPI is the option most tools leave out and passport or form photos usually need. The work runs off the main thread, so a large batch does not freeze the page.',
  },
}
