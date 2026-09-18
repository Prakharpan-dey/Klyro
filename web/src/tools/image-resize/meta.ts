import { IMAGE_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'image-resize',
  code: 'IMG-02',
  title: 'Resize',
  summary: 'px, percent or cm at a chosen DPI.',
  category: 'image',
  group: 'Image',
  accept: IMAGE_ACCEPT,
  multiple: true,
}
