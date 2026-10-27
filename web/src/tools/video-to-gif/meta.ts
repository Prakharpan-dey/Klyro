import { VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-to-gif',
  code: 'VID-05',
  title: 'Video → GIF',
  summary: 'Turn a few seconds of a clip into a GIF.',
  category: 'video',
  group: 'Video',
  accept: VIDEO_ACCEPT,
  multiple: false,
  seo: {
    title: 'Video to GIF — free, in your browser | Klyro',
    description:
      'Turn a few seconds of an MP4, MOV or WebM into an animated GIF. Pick the moment, size and frame rate; the clip is never uploaded anywhere.',
    about:
      'For a reaction, a bug report that needs to show a glitch happening, or a product demo that has to play inline where video will not. Pick the start and end on the preview, choose the width and frame rate, and see roughly how large the GIF will be before you make it. GIFs are capped at twenty seconds because the format grows quickly.',
  },
}
