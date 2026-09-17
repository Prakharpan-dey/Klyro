import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchesAccept, readMeta, type FileMeta } from '@/lib/fileMeta'
import { useWorkspace } from '@/features/workspace/useWorkspace'

export interface ToolFile {
  id: string
  file: File
  meta?: FileMeta
}

/** Files for a single tool. Starts with whatever matching files are staged on the home console. */
export function useToolFiles(accept: string[], multiple: boolean) {
  const workspace = useWorkspace()
  const [files, setFiles] = useState<ToolFile[]>(() =>
    workspace.files
      .filter((s) => matchesAccept(s.file, accept))
      .slice(0, multiple ? undefined : 1)
      .map((s) => ({ id: s.id, file: s.file, meta: s.meta })),
  )
  const [rejected, setRejected] = useState(0)
  const reading = useRef(new Set<string>())

  // fill in details for anything that arrived without them
  useEffect(() => {
    for (const f of files) {
      if (f.meta || reading.current.has(f.id)) continue
      reading.current.add(f.id)
      readMeta(f.file).then((meta) =>
        setFiles((prev) => prev.map((p) => (p.id === f.id && !p.meta ? { ...p, meta } : p))),
      )
    }
  }, [files])

  const add = useCallback(
    (incoming: File[]) => {
      const ok = incoming.filter((f) => matchesAccept(f, accept))
      setRejected(incoming.length - ok.length)
      const next = ok.map((file) => ({ id: crypto.randomUUID(), file }))
      setFiles((prev) => (multiple ? [...prev, ...next] : next.slice(0, 1)))
    },
    [accept, multiple],
  )

  const remove = useCallback(
    (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)),
    [],
  )
  const clear = useCallback(() => setFiles([]), [])

  const move = useCallback((fromId: string, toId: string) => {
    setFiles((prev) => {
      const from = prev.findIndex((f) => f.id === fromId)
      const to = prev.findIndex((f) => f.id === toId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }, [])

  const list = useMemo(() => files.map((f) => f.file), [files])

  return { files, list, add, remove, clear, move, rejected }
}
