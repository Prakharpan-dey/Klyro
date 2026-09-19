import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-exif',
  code: 'IMG-04',
  title: 'Photo Privacy',
  summary: 'See what a photo knows about you, and remove it.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
}
