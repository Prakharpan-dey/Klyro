/**
 * Which codec can live in which container. Getting this wrong is not a subtle
 * bug: the conversion simply refuses halfway, so the table is checked before a
 * run starts and is covered by tests.
 */

export type VideoContainer = 'mp4' | 'webm'
export type VideoCodec = 'avc' | 'vp9' | 'av1'
export type AudioCodec = 'aac' | 'opus'

interface ContainerSpec {
  mime: string
  audioMime: string
  extension: string
  video: VideoCodec[]
  audio: AudioCodec[]
}

export const CONTAINERS: Record<VideoContainer, ContainerSpec> = {
  mp4: {
    mime: 'video/mp4',
    audioMime: 'audio/mp4',
    extension: 'mp4',
    video: ['avc', 'av1'],
    audio: ['aac'],
  },
  webm: {
    mime: 'video/webm',
    audioMime: 'audio/webm',
    extension: 'webm',
    video: ['vp9', 'av1'],
    audio: ['opus'],
  },
}

export function allowsVideo(container: VideoContainer, codec: VideoCodec): boolean {
  return CONTAINERS[container].video.includes(codec)
}

export function allowsAudio(container: VideoContainer, codec: AudioCodec): boolean {
  return CONTAINERS[container].audio.includes(codec)
}

/** The codec a container should use by default: the one players actually have. */
export function defaultVideoCodec(container: VideoContainer): VideoCodec {
  return container === 'mp4' ? 'avc' : 'vp9'
}

export function defaultAudioCodec(container: VideoContainer): AudioCodec {
  return container === 'mp4' ? 'aac' : 'opus'
}

/** Keeps a requested codec when the container allows it, otherwise falls back. */
export function resolveVideoCodec(container: VideoContainer, wanted?: VideoCodec): VideoCodec {
  return wanted && allowsVideo(container, wanted) ? wanted : defaultVideoCodec(container)
}

export function resolveAudioCodec(container: VideoContainer, wanted?: AudioCodec): AudioCodec {
  return wanted && allowsAudio(container, wanted) ? wanted : defaultAudioCodec(container)
}

/** The container a file is already in, so "convert" can offer the other one. */
export function containerOf(file: File): VideoContainer | undefined {
  if (/webm|matroska/i.test(file.type) || /\.(webm|mkv)$/i.test(file.name)) return 'webm'
  if (/mp4|quicktime/i.test(file.type) || /\.(mp4|m4v|mov)$/i.test(file.name)) return 'mp4'
  return undefined
}
