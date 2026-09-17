import { createContext } from 'react'
import type { FileMeta } from '@/lib/fileMeta'

export interface StagedFile {
  id: string
  file: File
  meta?: FileMeta
}

export interface Workspace {
  files: StagedFile[]
  add: (files: File[]) => void
  remove: (id: string) => void
  clear: () => void
}

export const WorkspaceContext = createContext<Workspace | null>(null)
