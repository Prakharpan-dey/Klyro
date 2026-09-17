import type { ReactNode } from 'react'
import { formatBytes } from '@/lib/format'
import type { FileMeta } from '@/lib/fileMeta'

export function describeMeta(meta: FileMeta | undefined, size: number): ReactNode {
  if (!meta) return `${formatBytes(size)} · reading…`
  const parts: ReactNode[] = []
  if (meta.pages) parts.push(`${meta.pages} pp`)
  if (meta.width && meta.height) parts.push(`${meta.width}×${meta.height}`)
  parts.push(formatBytes(size))
  if (meta.encrypted) parts.push(<span className="text-egress">Password protected</span>)
  if (meta.hasExif) parts.push(<span className="text-egress">EXIF present</span>)
  return parts.map((p, i) => (
    <span key={i}>
      {i > 0 && ' · '}
      {p}
    </span>
  ))
}
