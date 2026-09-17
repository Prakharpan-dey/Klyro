import { renameWithExt, type ImageFormat, type ResizeSpec } from '@/lib/imageMath'
import type { OutputFile, Progress } from '../types'
import { runTransform } from './pool'

export interface ResizeParams {
  resize: ResizeSpec
  format: ImageFormat | 'keep'
  quality?: number
}

export async function resizeImages(
  files: File[],
  params: ResizeParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  let done = 0
  onProgress?.(0, files.length, 'Resizing')

  return Promise.all(
    files.map(async (file) => {
      const r = await runTransform(file, {
        format: params.format,
        quality: params.quality ?? 0.92,
        resize: params.resize,
      })
      onProgress?.(++done, files.length, file.name)
      const type = r.blob.type || 'image/jpeg'
      return {
        file: new File([r.blob], renameWithExt(file.name, type, `-${r.width}x${r.height}`), {
          type,
        }),
        sourceName: file.name,
        sourceSize: file.size,
        width: r.width,
        height: r.height,
      }
    }),
  )
}
