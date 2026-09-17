import { useCallback, useMemo, useState } from 'react'
import { matchesAccept } from '@/lib/fileMeta'
import { useWorkspace } from '@/features/workspace/useWorkspace'

export interface ToolFile {
  id: string
  file: File
}

/** Files for a single tool. Starts with whatever matching files are staged on the home console. */
export function useToolFiles(accept: string[], multiple: boolean) {
  const workspace = useWorkspace()
  const [files, setFiles] = useState<ToolFile[]>(() =>
    workspace.files
      .filter((s) => matchesAccept(s.file, accept))
      .slice(0, multiple ? undefined : 1)
      .map((s) => ({ id: s.id, file: s.file })),
  )
  const [rejected, setRejected] = useState(0)

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
  const list = useMemo(() => files.map((f) => f.file), [files])

  return { files, list, add, remove, clear, rejected }
}
