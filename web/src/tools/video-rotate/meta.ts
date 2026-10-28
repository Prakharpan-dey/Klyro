import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-rotate',
  code: 'VID-06',
  title: 'Rotate Video',
  summary: 'Turn a sideways clip the right way up, or mirror it.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
  seo: {
    title: 'Rotate a Video — fix sideways clips, no upload | Klyro',
    description:
      'Turn a sideways or upside-down video the right way up, or mirror a selfie clip, in your browser. Usually instant and lossless. No upload, no watermark.',
    about:
      'A phone records in whatever way it was held, and the clip that comes out is sometimes on its side. By default the turn is written into the file as a flag, the same way the phone does it, so nothing is re-encoded and it finishes in a second. For an upload form that ignores the flag, turn the pixels instead: slower, and the clip is re-encoded once.',
  },
}
