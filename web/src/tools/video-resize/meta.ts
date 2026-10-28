import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-resize',
  code: 'VID-07',
  title: 'Resize Video',
  summary: 'Change a clip to 1080p, 720p, 480p or a height you choose.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
  seo: {
    title: 'Resize a Video — 1080p, 720p, 480p, free | Klyro',
    description:
      'Change the resolution of a video to 1080p, 720p, 480p or any height, keeping its shape, in your browser. No upload, no account, no watermark.',
    about:
      'Pick a height and the width follows the shape of the clip, so nothing is stretched or boxed in. The bitrate scales with the picture, so a smaller frame gives a smaller file at the same look. Encoding runs on your own machine through WebCodecs; the clip is never uploaded.',
  },
}
