import { renameWithExt, type ImageFormat } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'
import { runTransform } from './pool'

export interface ConvertParams {
  format: ImageFormat
  quality: number
}

export async function convertImages(
  files: File[],
  params: ConvertParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  let done = 0
  onProgress?.(0, files.length, 'Converting')

  return Promise.all(
    files.map(async (file) => {
      const r = await runTransform(file, { format: params.format, quality: params.quality })
      onProgress?.(++done, files.length, file.name)
      return {
        file: new File([r.blob], renameWithExt(file.name, params.format), { type: params.format }),
        sourceName: file.name,
        sourceSize: file.size,
        width: r.width,
        height: r.height,
      }
    }),
  )
}
