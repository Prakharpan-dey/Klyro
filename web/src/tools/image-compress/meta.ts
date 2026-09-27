import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-compress',
  code: 'IMG-01',
  title: 'Compress',
  summary: 'Quality slider or an exact KB target.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
  seo: {
    title: 'Compress an Image to an exact KB | Klyro',
    description:
      'Shrink a JPG, PNG or WebP to an exact size in KB, in your browser. Nothing is uploaded. Set a target and the quality is searched for you. Free, no account.',
    about:
      'Built for upload limits that name a number: under 200 KB, under 1 MB. Give the target and the quality is adjusted until it fits, rather than making you guess at a slider. If the best attempt would be larger than what you started with, the original is kept and the tool tells you.',
  },
}
