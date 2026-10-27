import { renameWithExt } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'
import type { CropBox, Flip, QuarterTurn, Watermark } from './geometry'
import { runTransform } from './pool'

/**
 * Crop, turn and watermark, one file at a time through the worker pool.
 *
 * All three keep the picture's own format and re-encode at high quality: the
 * point of each is the edit, not a change of format or a smaller file.
 */

const QUALITY = 0.92

async function edit(
  file: File,
  params: { crop?: CropBox; rotate?: QuarterTurn; flip?: Flip; watermark?: Watermark },
  suffix: string,
): Promise<OutputFile> {
  const r = await runTransform(file, { format: 'keep', quality: QUALITY, ...params })
  return {
    file: new File([r.blob], renameWithExt(file.name, r.blob.type, suffix), { type: r.blob.type }),
    sourceName: file.name,
    sourceSize: file.size,
    width: r.width,
    height: r.height,
  }
}

async function eachFile(
  files: File[],
  label: string,
  run: (file: File) => Promise<OutputFile>,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  let done = 0
  onProgress?.(0, files.length, label)
  return Promise.all(
    files.map(async (file) => {
      const out = await run(file)
      onProgress?.(++done, files.length, file.name)
      return out
    }),
  )
}

/** One crop box, as fractions, applied to every file. */
export function cropImages(files: File[], crop: CropBox, onProgress?: Progress) {
  return eachFile(files, 'Cropping', (file) => edit(file, { crop }, '-cropped'), onProgress)
}

export function rotateImages(
  files: File[],
  turn: { rotate: QuarterTurn; flip: Flip },
  onProgress?: Progress,
) {
  return eachFile(files, 'Turning', (file) => edit(file, turn, '-turned'), onProgress)
}

export function watermarkImages(files: File[], watermark: Watermark, onProgress?: Progress) {
  return eachFile(files, 'Marking', (file) => edit(file, { watermark }, '-marked'), onProgress)
}
