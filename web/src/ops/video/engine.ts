import {
  CONTAINERS,
  resolveAudioCodec,
  resolveVideoCodec,
  type AudioCodec,
  type VideoCodec,
  type VideoContainer,
} from './compatibility'

/**
 * Video work, done by the browser's own encoder.
 *
 * WebCodecs hands the frames to the same hardware encoder a phone uses to
 * record, which is why a clip takes about as long as it lasts instead of ten
 * times that. mediabunny reads and writes the container around it. Nothing is
 * uploaded and nothing is installed: if the browser cannot encode, the tool
 * says so instead of pretending.
 */

export type ErrorCode = 'no-webcodecs' | 'undecodable' | 'unencodable' | 'too-large' | 'aborted'

export class VideoEngineError extends Error {
  code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/** Above this a tab is likely to be killed before the encode finishes. */
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024
export const LARGE_VIDEO_BYTES = 200 * 1024 * 1024

export interface VideoCapability {
  ok: boolean
  /** shown to the reader as it is written here */
  reason?: string
  video: Partial<Record<VideoCodec, boolean>>
  audio: Partial<Record<AudioCodec, boolean>>
}

let capability: Promise<VideoCapability> | null = null

async function detect(): Promise<VideoCapability> {
  if (typeof VideoEncoder === 'undefined') {
    return {
      ok: false,
      reason:
        'This browser cannot encode video on your device. Chrome, Edge, or Safari 16.4 and newer will. Either way, nothing here is ever uploaded.',
      video: {},
      audio: {},
    }
  }

  const { canEncodeAudio, canEncodeVideo } = await import('mediabunny')
  const videoCodecs: VideoCodec[] = ['avc', 'vp9', 'av1']
  const audioCodecs: AudioCodec[] = ['aac', 'opus']

  const video: Partial<Record<VideoCodec, boolean>> = {}
  const audio: Partial<Record<AudioCodec, boolean>> = {}

  await Promise.all([
    ...videoCodecs.map(async (codec) => {
      video[codec] = await canEncodeVideo(codec, { width: 1280, height: 720 }).catch(() => false)
    }),
    ...audioCodecs.map(async (codec) => {
      audio[codec] = await canEncodeAudio(codec).catch(() => false)
    }),
  ])

  const ok = videoCodecs.some((codec) => video[codec])
  return {
    ok,
    reason: ok
      ? undefined
      : 'This browser has the video interface but no encoder it can use on this machine. Chrome or Edge on a desktop usually works.',
    video,
    audio,
  }
}

/** Cached for the tab; the answer cannot change while it is open. */
export function probeCapability(): Promise<VideoCapability> {
  capability ??= detect()
  return capability
}

export interface VideoRunOptions {
  container: VideoContainer
  video?: {
    codec?: VideoCodec
    bitrate?: number
    width?: number
    height?: number
    /** clockwise, on top of whatever turn the file already carries */
    rotate?: 0 | 90 | 180 | 270
    /** mirror left to right */
    flip?: boolean
    /**
     * Turn the pixels themselves instead of writing a rotation flag. Slower and
     * one generation of quality, but some upload forms ignore the flag.
     */
    bakeTransform?: boolean
    discard?: boolean
  }
  audio?: { codec?: AudioCodec; bitrate?: number; discard?: boolean }
  trim?: { start?: number; end?: number }
  /**
   * Write an MP3 instead of the container: sound only. No browser ships an MP3
   * encoder, so a WebAssembly one is loaded for this, and only for this.
   */
  mp3?: boolean
  signal?: AbortSignal
  /** 0 to 1, within this one file */
  onFraction?: (fraction: number) => void
}

export interface VideoRunResult {
  blob: Blob
  /** what had to be left out, already in plain words */
  dropped: string[]
}

const DROP_REASONS: Record<string, string> = {
  undecodable_source_codec: 'this browser cannot decode it',
  unknown_source_codec: 'its format is not recognised',
  no_encodable_target_codec: 'there is no encoder for it that fits this container',
  max_track_count_of_type_reached: 'the chosen container has no room for it',
  cannot_copy: 'it could not be copied without re-encoding',
}

let mp3Ready: Promise<void> | null = null

/** Registers the WebAssembly MP3 encoder once per tab, on first use. */
function mp3Encoder(): Promise<void> {
  mp3Ready ??= import('@mediabunny/mp3-encoder').then(({ registerMp3Encoder }) =>
    registerMp3Encoder(),
  )
  return mp3Ready
}

export async function runConversion(file: File, options: VideoRunOptions): Promise<VideoRunResult> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new VideoEngineError(
      'too-large',
      'This file is over 500 MB. A browser tab runs out of room before it finishes; trim it first, or use a smaller recording.',
    )
  }

  // sound alone needs no video encoder, so a browser without one can still do it
  const capabilities = options.mp3 ? undefined : await probeCapability()
  if (capabilities && !capabilities.ok) {
    throw new VideoEngineError('no-webcodecs', capabilities.reason!)
  }
  if (options.mp3) await mp3Encoder()

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    ConversionCanceledError,
    Input,
    Mp3OutputFormat,
    Mp4OutputFormat,
    Output,
    Quality,
    WebMOutputFormat,
  } = await import('mediabunny')

  const spec = CONTAINERS[options.container]
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  const output = new Output({
    format: options.mp3
      ? new Mp3OutputFormat()
      : options.container === 'mp4'
        ? new Mp4OutputFormat()
        : new WebMOutputFormat(),
    target: new BufferTarget(),
  })

  const wantsVideo = !options.video?.discard && !options.mp3

  const conversion = await Conversion.init({
    input,
    output,
    video: !wantsVideo
      ? { discard: true }
      : {
          codec: resolveVideoCodec(options.container, options.video?.codec),
          width: options.video?.width,
          height: options.video?.height,
          // both sides given means a box, and a box needs a rule for filling it;
          // ours are worked out from the source ratio, so nothing is letterboxed
          ...(options.video?.width && options.video?.height ? { fit: 'contain' as const } : {}),
          rotate: options.video?.rotate,
          flip: options.video?.flip,
          allowTransformationMetadata: !options.video?.bakeTransform,
          // a bare number is read as a quality *level*; the bitrate needs naming
          ...(options.video?.bitrate
            ? { quality: new Quality({ bitrate: options.video.bitrate }) }
            : {}),
        },
    audio: options.audio?.discard
      ? { discard: true }
      : {
          codec: options.mp3 ? 'mp3' : resolveAudioCodec(options.container, options.audio?.codec),
          ...(options.audio?.bitrate
            ? { quality: new Quality({ bitrate: options.audio.bitrate }) }
            : {}),
        },
    trim: options.trim,
  })

  const dropped = conversion.discardedTracks
    .filter((track) => track.reason !== 'discarded_by_user')
    .map(
      (track) => `${track.track.type} track dropped: ${DROP_REASONS[track.reason] ?? track.reason}`,
    )

  if (!conversion.isValid) {
    if (options.mp3) {
      throw new VideoEngineError(
        'undecodable',
        dropped[0]
          ? `The sound in this file cannot be read here — ${dropped[0]}.`
          : 'This file has no sound in it to save.',
      )
    }
    const why = dropped[0] ?? 'nothing in this file could be converted'
    throw new VideoEngineError(
      wantsVideo && !capabilities?.video[resolveVideoCodec(options.container, options.video?.codec)]
        ? 'unencodable'
        : 'undecodable',
      `This video cannot be converted here — ${why}.`,
    )
  }

  if (options.onFraction) conversion.onProgress = (fraction) => options.onFraction!(fraction)

  const abort = () => void conversion.cancel()
  options.signal?.addEventListener('abort', abort, { once: true })

  try {
    await conversion.execute()
  } catch (err) {
    if (err instanceof ConversionCanceledError || options.signal?.aborted) {
      throw new DOMException('Stopped', 'AbortError')
    }
    throw new VideoEngineError(
      'unencodable',
      err instanceof Error && err.message ? err.message : 'This video could not be converted',
    )
  } finally {
    options.signal?.removeEventListener('abort', abort)
  }

  const buffer = output.target.buffer
  if (!buffer) throw new VideoEngineError('unencodable', 'The converted video came back empty')

  const type = options.mp3 ? 'audio/mpeg' : wantsVideo ? spec.mime : spec.audioMime
  const blob = new Blob([buffer], { type })
  // let the ArrayBuffer go now that the Blob owns a copy; these are tens of MB
  output.target.buffer = null
  return { blob, dropped }
}
