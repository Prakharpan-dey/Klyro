import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-trim',
  code: 'VID-02',
  title: 'Trim Video',
  summary: 'Keep the part you want and drop the rest.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
}
