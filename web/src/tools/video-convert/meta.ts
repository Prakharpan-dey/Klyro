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
  seo: {
    title: 'Convert Video — MP4 to WebM, free | Klyro',
    description:
      'Move a clip between MP4 and WebM in your browser. Hardware-accelerated through WebCodecs, with no upload, no queue and no watermark on the result.',
    about:
      'Useful when a site accepts one container and you have the other. The clip is re-encoded on your own machine using WebCodecs, so there is no upload and no waiting in a queue. Which codecs are available depends on your browser, and the tool says what it can do before it starts.',
  },
}
