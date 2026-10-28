import { baseName } from '../pdf/load'
import type { OutputFile, Progress } from '../types'
import {
  budgetForTarget,
  estimateBytes,
  fitHeight,
  presetBitrate,
  resizeBitrate,
  suggestScale,
  type QualityTier,
} from './bitrate'
import { CONTAINERS, containerOf, type VideoContainer } from './compatibility'
import { runConversion, type VideoRunOptions } from './engine'
import { probeVideo, type VideoProbe } from './probe'

/**
 * The four things people actually want done to a video, each a thin layer over
 * the same conversion: make it smaller, cut a piece out, change the container,
 * or deal with the sound.
 */

const AUDIO_BPS = 128_000

function out(file: File, blob: Blob, name: string, note: string, dropped: string[]): OutputFile {
  return {
    file: new File([blob], name, { type: blob.type }),
    sourceName: file.name,
    sourceSize: file.size,
    note,
    warning: dropped.length ? dropped.join('; ') : undefined,
  }
}

function seconds(value: number): string {
  const minutes = Math.floor(value / 60)
  return `${minutes}:${String(Math.round(value % 60)).padStart(2, '0')}`
}

/** Runs one conversion per file, reporting progress inside each one. */
async function each(
  files: File[],
  onProgress: Progress | undefined,
  signal: AbortSignal | undefined,
  build: (
    file: File,
    probe: VideoProbe,
  ) => Promise<{ options: VideoRunOptions; name: string; note: string }>,
): Promise<OutputFile[]> {
  const results: OutputFile[] = []

  for (const [index, file] of files.entries()) {
    onProgress?.(index, files.length, `Reading ${file.name}`)
    const probe = await probeVideo(file)
    const { options, name, note } = await build(file, probe)

    const result = await runConversion(file, {
      ...options,
      signal,
      onFraction: (fraction) =>
        onProgress?.(
          index + fraction,
          files.length,
          `${file.name} · ${Math.round(fraction * 100)}%`,
        ),
    })
    results.push(out(file, result.blob, name, note, result.dropped))
  }

  onProgress?.(files.length, files.length, 'Done')
  return results
}

export interface CompressVideoParams {
  mode: 'target' | 'quality'
  /** target size in megabytes, for the target mode */
  targetMB: number
  tier: QualityTier
  /** 0 keeps the original height */
  height: number
  muted: boolean
  container: VideoContainer
}

export interface CompressionPlan {
  videoBps: number
  audioBps: number
  size?: { width: number; height: number }
  bytes: number
  achievable: boolean
  /** the source already fits, so this run can only make it look worse */
  alreadySmaller: boolean
}

/** Everything the settings panel needs to show before the run starts. */
export function planCompression(
  probe: VideoProbe,
  params: CompressVideoParams,
  sourceBytes?: number,
): CompressionPlan {
  const audioBps = params.muted || !probe.hasAudio ? 0 : AUDIO_BPS
  const source = { width: probe.width ?? 1280, height: probe.height ?? 720 }
  const box = params.height ? { width: 0, height: params.height } : undefined

  // never spend more bits than the original had: compressing must not inflate
  const sourceBps = sourceBytes && probe.durationSec ? (sourceBytes * 8) / probe.durationSec : 0
  const ceiling = sourceBps ? Math.max(120_000, sourceBps - audioBps) : Infinity

  const wanted =
    params.mode === 'quality'
      ? presetBitrate(params.height || source.height, params.tier)
      : budgetForTarget({
          targetBytes: params.targetMB * 1024 * 1024,
          durationSec: probe.durationSec,
          audioBps,
        }).videoBps

  const achievable =
    params.mode === 'quality' ||
    budgetForTarget({
      targetBytes: params.targetMB * 1024 * 1024,
      durationSec: probe.durationSec,
      audioBps,
    }).achievable

  const videoBps = Math.round(Math.min(wanted, ceiling))

  return {
    videoBps,
    audioBps,
    // a thin bitrate on a big frame looks like wet paint, so step the size down
    size: box ?? suggestScale(source, videoBps),
    bytes: estimateBytes(videoBps, audioBps, probe.durationSec),
    achievable,
    alreadySmaller: videoBps < wanted,
  }
}

export function compressVideo(
  files: File[],
  params: CompressVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file, probe) => {
    const plan = planCompression(probe, params, file.size)
    const spec = CONTAINERS[params.container]

    return {
      name: `${baseName(file.name)}-small.${spec.extension}`,
      note: plan.achievable
        ? `${Math.round(plan.videoBps / 1000)} kbps`
        : `${Math.round(plan.videoBps / 1000)} kbps · as small as it goes`,
      options: {
        container: params.container,
        video: {
          bitrate: plan.videoBps,
          width: plan.size?.width || undefined,
          height: plan.size?.height || undefined,
        },
        audio: params.muted ? { discard: true } : { bitrate: plan.audioBps },
      },
    }
  })
}

export interface TrimVideoParams {
  start: number
  end: number
  container?: VideoContainer
}

export function trimVideo(
  files: File[],
  params: TrimVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file) => {
    const container = params.container ?? containerOf(file) ?? 'mp4'
    return {
      name: `${baseName(file.name)}-trimmed.${CONTAINERS[container].extension}`,
      note: `${seconds(params.start)} to ${seconds(params.end)}`,
      options: { container, trim: { start: params.start, end: params.end } },
    }
  })
}

export interface ConvertVideoParams {
  container: VideoContainer
}

export function convertVideo(
  files: File[],
  params: ConvertVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file) => ({
    name: `${baseName(file.name)}.${CONTAINERS[params.container].extension}`,
    note: params.container.toUpperCase(),
    options: { container: params.container },
  }))
}

export interface AudioVideoParams {
  /** 'mute' keeps the picture, 'extract' keeps the sound */
  keep: 'video' | 'audio'
  container?: VideoContainer
}

export function stripAudio(
  files: File[],
  params: AudioVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file) => {
    const container = params.container ?? containerOf(file) ?? 'mp4'
    const spec = CONTAINERS[container]

    if (params.keep === 'audio') {
      // .m4a opens everywhere; a bare WebM audio file confuses most players
      const audioContainer = params.container ?? 'mp4'
      return {
        name: `${baseName(file.name)}.${audioContainer === 'mp4' ? 'm4a' : 'webm'}`,
        note: 'audio only',
        options: { container: audioContainer, video: { discard: true } },
      }
    }
    return {
      name: `${baseName(file.name)}-muted.${spec.extension}`,
      note: 'no sound',
      options: { container, audio: { discard: true } },
    }
  })
}

export type QuarterTurn = 0 | 90 | 180 | 270

export interface RotateVideoParams {
  rotate: QuarterTurn
  flip: boolean
  /** re-encode so the pixels turn, instead of only flagging the turn */
  bake: boolean
}

export function describeTurn(rotate: QuarterTurn, flip: boolean): string {
  const turn = { 0: '', 90: 'turned right', 180: 'turned over', 270: 'turned left' }[rotate]
  return [turn, flip ? 'mirrored' : ''].filter(Boolean).join(', ') || 'unchanged'
}

export function rotateVideo(
  files: File[],
  params: RotateVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file) => {
    const container = containerOf(file) ?? 'mp4'
    return {
      name: `${baseName(file.name)}-rotated.${CONTAINERS[container].extension}`,
      note: describeTurn(params.rotate, params.flip),
      options: {
        container,
        video: { rotate: params.rotate, flip: params.flip, bakeTransform: params.bake },
      },
    }
  })
}

export interface ResizeVideoParams {
  /** the new height of the picture as seen; the width follows the shape */
  height: number
}

/** The new frame, its bitrate and the size it will come to, before the run. */
export function planResize(probe: VideoProbe, height: number, sourceBytes: number) {
  const source = { width: probe.width ?? 1280, height: probe.height ?? 720 }
  const target = fitHeight(source, height)
  const audioBps = probe.hasAudio ? AUDIO_BPS : 0
  const videoBps = resizeBitrate({
    source,
    target,
    sourceBytes,
    durationSec: probe.durationSec,
    audioBps,
  })
  return {
    target,
    videoBps,
    bytes: estimateBytes(videoBps, audioBps, probe.durationSec),
    upscale: target.height > source.height,
  }
}

export function resizeVideo(
  files: File[],
  params: ResizeVideoParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file, probe) => {
    const container = containerOf(file) ?? 'mp4'
    const { target, videoBps } = planResize(probe, params.height, file.size)

    return {
      name: `${baseName(file.name)}-${target.height}p.${CONTAINERS[container].extension}`,
      note: `${target.width}×${target.height}`,
      options: {
        container,
        video: { width: target.width, height: target.height, bitrate: videoBps },
      },
    }
  })
}

export type Mp3Bitrate = 128 | 192 | 320

export interface Mp3Params {
  kbps: Mp3Bitrate
  /** seconds; leave both out for the whole file */
  trim?: { start: number; end: number }
}

/** The sound of a video or audio file, as an MP3. */
export function toMp3(
  files: File[],
  params: Mp3Params,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile[]> {
  return each(files, onProgress, signal, async (file) => ({
    name: `${baseName(file.name)}.mp3`,
    note: params.trim
      ? `${params.kbps} kbps · ${seconds(params.trim.start)} to ${seconds(params.trim.end)}`
      : `${params.kbps} kbps`,
    options: {
      container: 'mp4',
      mp3: true,
      audio: { bitrate: params.kbps * 1000 },
      trim: params.trim,
    },
  }))
}
