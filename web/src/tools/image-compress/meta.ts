import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-compress',
  code: 'IMG-01',
  title: 'Compress',
  summary: 'Quality slider or an exact KB target.',
  category: 'image',
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/avif', 'image/gif'],
  multiple: true,
}
