import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-convert',
  code: 'IMG-03',
  title: 'Convert',
  summary: 'Switch between JPG, PNG and WebP.',
  category: 'image',
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/avif', 'image/gif'],
  multiple: true,
}
