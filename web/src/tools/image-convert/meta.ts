import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-convert',
  code: 'IMG-03',
  title: 'Convert',
  summary: 'Switch between JPG, PNG and WebP.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
}
