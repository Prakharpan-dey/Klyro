import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-resize',
  code: 'IMG-02',
  title: 'Resize',
  summary: 'px, percent or cm at a chosen DPI.',
  category: 'image',
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/avif', 'image/gif'],
  multiple: true,
}
