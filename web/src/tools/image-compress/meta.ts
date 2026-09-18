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
}
