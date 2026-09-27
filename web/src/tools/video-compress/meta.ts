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
  seo: {
    title: 'Compress Video in your browser — free | Klyro',
    description:
      'Fit a video under a size limit without uploading it. Encoding runs on your own machine through WebCodecs, using your hardware. No account, no watermark.',
    about:
      'For a clip that will not attach because it is forty megabytes. Name a target size and the bitrate is worked out from the duration. Encoding uses WebCodecs, which means your own graphics hardware does the work — no queue, no upload, and a long clip does not cost you an upload as well.',
  },
}
