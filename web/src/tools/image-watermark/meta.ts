import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-watermark',
  code: 'IMG-08',
  title: 'Watermark',
  summary: 'Stamp text across photos before sharing.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Watermark Photos — free, in your browser | Klyro',
    description:
      'Add a text watermark to photos, in a corner or tiled across the whole picture. Batches at once, and the originals never leave your device.',
    about:
      'Use it before posting photos you would rather not see reused, or to mark a copy of an ID as "for rental application only" so it cannot be passed off for anything else. Place the text in a corner or repeat it across the picture, set how strongly it shows, and stamp a whole batch the same way. The mark is drawn into the pixels.',
  },
}
