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
  seo: {
    title: 'Trim a Video — no upload, no watermark | Klyro',
    description:
      'Keep the part of a clip you want and drop the rest, in your browser. No upload, no account, no watermark. Encoding uses WebCodecs on your own machine.',
    about:
      'Cut the dead air off the front, or pull a ten second moment out of a long recording. Set the start and end and the rest is discarded. Because the clip never goes to a server, this works on footage you would not hand to a free online editor in the first place.',
  },
}
