/**
 * What a video is, read from its header before anything heavy starts.
 *
 * The file is never loaded whole: mediabunny reads through `file.slice()`, so
 * this costs the same on a 200 MB clip as on a 2 MB one. Knowing the duration
 * up front is what lets the tool show the size a target will produce before
 * you commit minutes to it.
 */

export interface VideoProbe {
  durationSec: number
  width?: number
  height?: number
  rotation?: number
  hasAudio: boolean
  videoCodec?: string
  audioCodec?: string
  canDecodeVideo: boolean
  canDecodeAudio: boolean
}

export async function probeVideo(file: File): Promise<VideoProbe> {
  const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny')
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })

  const [video, audio] = await Promise.all([
    input.getPrimaryVideoTrack(),
    input.getPrimaryAudioTrack(),
  ])

  const [width, height, rotation, canDecodeVideo] = video
    ? await Promise.all([
        video.getDisplayWidth(),
        video.getDisplayHeight(),
        video.getRotation(),
        video.canDecode(),
      ])
    : [undefined, undefined, undefined, false]

  return {
    durationSec: await input.computeDuration(),
    width,
    height,
    rotation,
    hasAudio: Boolean(audio),
    videoCodec: video?.codec ?? undefined,
    audioCodec: audio?.codec ?? undefined,
    canDecodeVideo,
    canDecodeAudio: audio ? await audio.canDecode() : false,
  }
}
