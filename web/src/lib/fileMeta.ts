export type FileKind = 'image' | 'pdf' | 'video' | 'other'

export interface FileMeta {
  kind: FileKind
  mime: string
  size: number
  width?: number
  height?: number
  pages?: number
  hasExif?: boolean
  encrypted?: boolean
  durationSec?: number
  hasAudio?: boolean
  videoCodec?: string
}

const EXIF_MARKER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // "Exif\0\0"

export function kindOf(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  // Windows hands .mkv and sometimes .mov over with an empty mime type
  if (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name)) return 'video'
  return 'other'
}

export function matchesAccept(file: File, accept: string[]): boolean {
  return accept.some((a) => {
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1))
    // some systems hand over PDFs with an empty mime type
    if (a === 'application/pdf') return kindOf(file) === 'pdf'
    if (a.startsWith('video/') && !file.type) return kindOf(file) === 'video'
    return file.type === a
  })
}

async function hasExifBlock(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer())
  outer: for (let i = 0; i <= bytes.length - EXIF_MARKER.length; i++) {
    for (let j = 0; j < EXIF_MARKER.length; j++) {
      if (bytes[i + j] !== EXIF_MARKER[j]) continue outer
    }
    return true
  }
  return false
}

export async function readMeta(file: File): Promise<FileMeta> {
  const meta: FileMeta = { kind: kindOf(file), mime: file.type, size: file.size }
  if (meta.kind === 'image') {
    try {
      const bitmap = await createImageBitmap(file)
      meta.width = bitmap.width
      meta.height = bitmap.height
      bitmap.close()
    } catch {
      // not decodable in this browser (e.g. HEIC); keep what we have
    }
    meta.hasExif = await hasExifBlock(file).catch(() => false)
  } else if (meta.kind === 'video') {
    try {
      // dynamic, so the video engine stays out of the bundle until it is needed
      const { probeVideo } = await import('@/ops/video/probe')
      const probe = await probeVideo(file)
      meta.durationSec = probe.durationSec
      meta.width = probe.width
      meta.height = probe.height
      meta.hasAudio = probe.hasAudio
      meta.videoCodec = probe.videoCodec
    } catch {
      // unreadable container; the tool will say so when it runs
    }
  } else if (meta.kind === 'pdf') {
    try {
      const { loadPdf } = await import('@/ops/pdf/load')
      meta.pages = (await loadPdf(file)).getPageCount()
    } catch (err) {
      meta.encrypted = err instanceof Error && /password/i.test(err.message)
    }
  }
  return meta
}
