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
  seo: {
    title: 'Extract Audio from Video — free | Klyro',
    description:
      'Keep only the sound of a clip, or silence it and keep the picture. Runs in your browser with no upload. Free, no account, no watermark on the output.',
    about:
      'Two jobs in one place: pull the audio out of a recording to keep as a file, or strip the audio from a clip you want to share silently. Both run through WebCodecs on your own machine. A clip with no audio track will say so rather than producing an empty file.',
  },
}
