import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-audio',
  code: 'VID-04',
  title: 'Mute or Extract Audio',
  summary: 'Silence a clip, or keep only its sound.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
}
