import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'heic-to-jpg',
  code: 'IMG-05',
  title: 'HEIC → JPG',
  summary: 'Open iPhone photos anywhere.',
  category: 'image',
  group: 'Image',
  accept: ['image/heic', 'image/heif'],
  multiple: true,
  seo: {
    title: 'HEIC to JPG — convert iPhone photos free | Klyro',
    description:
      'Convert iPhone HEIC photos to JPG or PNG in your browser. Batches of photos at once, the right way up, and never uploaded to a server.',
    about:
      'iPhones save photos as HEIC, which plenty of websites, Windows apps and printers still refuse. This turns them into ordinary JPG or PNG files that open everywhere, a whole batch at a time, keeping each photo the right way up. The location and camera details stored in the photo are left out of the converted copy.',
  },
}
