import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-crop',
  code: 'IMG-06',
  title: 'Crop',
  summary: 'Trim a photo to the part that matters.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Crop an Image — free, in your browser | Klyro',
    description:
      'Crop photos to a square, 4:3, 16:9 or any shape you drag, in your browser. Exact pixel sizes, batches at once, and nothing is ever uploaded.',
    about:
      'Use this for a profile picture that has to be square, a screenshot with a cluttered edge, or a photo that needs to fit a 16:9 slide. Drag the box or type exact values, and lock the shape so it cannot drift. The same box applies, as proportions, to every picture in the batch. The result keeps its original format.',
  },
}
