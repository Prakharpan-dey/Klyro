import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-convert',
  code: 'VID-03',
  title: 'Convert Video',
  summary: 'Move a clip between MP4 and WebM.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
}
