import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-compress',
  code: 'VID-01',
  title: 'Compress Video',
  summary: 'Fit a clip under a size limit, on your own machine.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
}
