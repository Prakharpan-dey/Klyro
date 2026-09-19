export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

export function formatSaving(before: number, after: number): string {
  if (!before) return ''
  const pct = Math.round(((after - before) / before) * 100)
  return pct <= 0 ? `−${Math.abs(pct)}%` : `+${pct}%`
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 42 → "0:42", 3800 → "1:03:20" */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}
