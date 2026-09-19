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
      const r = await runTransform(file, {
        format: params.format,
        quality: params.quality,
        maxBytes,
      })
      onProgress?.(++done, files.length, file.name)

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
