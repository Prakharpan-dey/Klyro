import type { OutputFile, Progress } from '../types'
import { baseName } from '../pdf/load'
import { MAX_VIDEO_BYTES, VideoEngineError } from './engine'

/**
 * A clip as an animated GIF.
 *
 * Frames are pulled at exact moments by mediabunny's decoder, then reduced to
 * 256 colours each and written by gifenc. Every frame gets its own palette,
 * which costs a little size and buys far fewer bands across skies and skin.
 *
 * GIF is a 1989 format with no real compression for video, so it is capped:
 * past twenty seconds the file is tens of megabytes and nobody wants it. The
 * tool shows an estimate before running, from the same arithmetic as below.
 */

export const MAX_GIF_SECONDS = 20

export interface GifParams {
  start: number
  end: number
  width: number
  fps: number
  loop: boolean
}

/** The moments to grab, one per frame, inside the clip and under the cap. */
export function frameTimes(start: number, end: number, fps: number): number[] {
  const span = Math.min(Math.max(0, end - start), MAX_GIF_SECONDS)
  const count = Math.max(1, Math.floor(span * fps + 1e-9))
  return Array.from({ length: count }, (_, i) => start + i / fps)
}

/** Output height for a width, kept even and at least one pixel. */
export function gifHeight(width: number, source: { width: number; height: number }): number {
  if (!source.width || !source.height) return width
  return Math.max(1, Math.round((width * source.height) / source.width))
}

/**
 * A rough size, for the warning before a long run rather than a promise.
 * Video through LZW lands near half a byte a pixel per frame in practice;
 * busy footage goes higher, a screen recording much lower.
 */
export function estimateGifBytes(width: number, height: number, frames: number): number {
  return Math.round(width * height * frames * 0.5)
}

export async function videoToGif(
  file: File,
  params: GifParams,
  onProgress?: Progress,
  signal?: AbortSignal,
): Promise<OutputFile> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new VideoEngineError('too-large', 'This file is over 500 MB. Trim it first, then make the GIF.')
  }
  if (typeof VideoDecoder === 'undefined') {
    throw new VideoEngineError(
      'no-webcodecs',
      'This browser cannot decode video on your device. Chrome, Edge, or Safari 16.4 and newer will.',
    )
  }

  const [{ ALL_FORMATS, BlobSource, CanvasSink, Input }, { GIFEncoder, applyPalette, quantize }] =
    await Promise.all([import('mediabunny'), import('gifenc')])

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  const track = await input.getPrimaryVideoTrack()
  if (!track || !(await track.canDecode())) {
    throw new VideoEngineError('undecodable', 'This browser cannot read the video in this file.')
  }

  const times = frameTimes(params.start, params.end, params.fps)
  // the rotation stored in the file is applied by the sink, so phone clips are upright
  const sink = new CanvasSink(track, { width: params.width })
  const gif = GIFEncoder()
  const delay = Math.round(1000 / params.fps)

  let written = 0
  let size = { width: 0, height: 0 }

  for await (const frame of sink.canvasesAtTimestamps(times)) {
    if (signal?.aborted) throw new VideoEngineError('aborted', 'Stopped.')
    if (!frame) continue

    const { canvas } = frame
    size = { width: canvas.width, height: canvas.height }
    const ctx = canvas.getContext('2d') as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const palette = quantize(data, 256)
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, {
      palette,
      delay,
      // only the first frame carries the loop setting; 0 means forever, -1 once
      repeat: params.loop ? 0 : -1,
    })

    written++
    onProgress?.(written, times.length, `Frame ${written} of ${times.length}`)
    // yield so the progress bar and the stop button stay responsive
    if (written % 4 === 0) await new Promise((r) => setTimeout(r, 0))
  }

  if (!written) {
    throw new VideoEngineError('undecodable', 'No frames could be read from that part of the clip.')
  }

  gif.finish()
  const bytes = gif.bytes()

  return {
    file: new File([bytes as BlobPart], `${baseName(file.name)}.gif`, { type: 'image/gif' }),
    sourceName: file.name,
    sourceSize: file.size,
    width: size.width,
    height: size.height,
    note: `${written} frames · ${params.fps} fps`,
  }
}
