import { AUDIO_ACCEPT, VIDEO_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'video-to-mp3',
  code: 'VID-08',
  title: 'Video → MP3',
  summary: 'Save the sound of a video, or any audio file, as an MP3.',
  category: 'video',
  group: 'Video',
  accept: [...VIDEO_ACCEPT, ...AUDIO_ACCEPT],
  multiple: false,
  seo: {
    title: 'Video to MP3 — convert MP4 and audio, no upload | Klyro',
    description:
      'Turn the sound of an MP4, MOV or WebM into an MP3, or convert WAV, M4A, OGG and FLAC, at 128, 192 or 320 kbps. Trim it first if you like. In your browser.',
    about:
      'Pull the audio out of a recording, a lecture or a voice note and get an MP3 that plays on anything. Choose the bitrate, and trim to just the part you want before saving. The encoder runs inside this tab, so the recording never leaves your device.',
  },
}
