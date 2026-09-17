import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { readMeta } from '@/lib/fileMeta'
import { WorkspaceContext, type StagedFile } from './context'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<StagedFile[]>([])

  const add = useCallback((incoming: File[]) => {
    const staged = incoming.map((file) => ({ id: crypto.randomUUID(), file }))
    setFiles((prev) => [...prev, ...staged])
    for (const s of staged) {
      readMeta(s.file).then((meta) =>
        setFiles((prev) => prev.map((f) => (f.id === s.id ? { ...f, meta } : f))),
      )
    }
  }, [])

  const remove = useCallback(
    (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)),
    [],
  )
  const clear = useCallback(() => setFiles([]), [])

  const value = useMemo(() => ({ files, add, remove, clear }), [files, add, remove, clear])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
