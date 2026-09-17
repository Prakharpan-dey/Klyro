import { transformImage, type TransformParams } from '@/ops/image/pipeline'

export interface ImageJobRequest {
  id: number
  file: Blob
  params: TransformParams
}

self.onmessage = async (event: MessageEvent<ImageJobRequest>) => {
  const { id, file, params } = event.data
  try {
    const result = await transformImage(file, params)
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
