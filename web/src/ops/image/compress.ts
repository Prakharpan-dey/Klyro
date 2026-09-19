import { formatBytes } from '@/lib/format'
import { renameWithExt, type ImageFormat } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'
import { runTransform } from './pool'

export interface CompressParams {
  format: ImageFormat
  /** 0–1, used when no target size is set */
  quality: number
  targetKB?: number
}

const NAMES: Record<ImageFormat, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
}

export async function compressImages(
  files: File[],
  params: CompressParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  let done = 0
  onProgress?.(0, files.length, 'Compressing')

  return Promise.all(
    files.map(async (file) => {
      const maxBytes = params.targetKB ? Math.floor(params.targetKB * 1024) : undefined

      // nothing to do: it already meets the target and re-encoding could only
      // cost quality for no gain
      if (maxBytes && file.size <= maxBytes && file.type === params.format) {
        onProgress?.(++done, files.length, file.name)
        return {
          file,
          sourceName: file.name,
          sourceSize: file.size,
          note: `already under ${params.targetKB} KB`,
        }
      }

      const r = await runTransform(file, {
        format: params.format,
        quality: params.quality,
        maxBytes,
      })
      onProgress?.(++done, files.length, file.name)

      // A tool called Compress must never hand back something heavier than what
      // it was given. A PNG of a photograph is the usual way that happens.
      if (r.blob.size >= file.size) {
        if (file.type === params.format) {
          return {
            file,
            sourceName: file.name,
            sourceSize: file.size,
            note: 'already compressed',
            warning: `Kept your original: nothing this can do to ${formatBytes(file.size)} of ${NAMES[params.format]} makes it smaller.`,
          }
        }
        return {
          file: new File([r.blob], renameWithExt(file.name, params.format, '-compressed'), {
            type: params.format,
          }),
          sourceName: file.name,
          sourceSize: file.size,
          width: r.width,
          height: r.height,
          warning: `${NAMES[params.format]} came out larger than the original ${formatBytes(file.size)}. For a photograph, JPG or WebP will be far smaller.`,
        }
      }

      const out: OutputFile = {
        file: new File([r.blob], renameWithExt(file.name, params.format, '-compressed'), {
          type: params.format,
        }),
        sourceName: file.name,
        sourceSize: file.size,
        width: r.width,
        height: r.height,
        note: r.quality ? `Q ${r.quality.toFixed(2)}` : undefined,
      }
      if (maxBytes && !r.fits) {
        out.warning = `Could not reach ${params.targetKB} KB — smallest was ${formatBytes(r.blob.size)}`
      }
      return out
    }),
  )
}
