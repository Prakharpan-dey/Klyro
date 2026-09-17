import { transformImage, type TransformParams, type TransformResult } from './pipeline'

interface Pending {
  resolve: (r: TransformResult) => void
  reject: (e: Error) => void
}

interface Slot {
  worker: Worker
  busy: number
}

export interface PoolStats {
  size: number
  busy: number
  mode: 'workers' | 'main-thread'
}

const canUseWorkers =
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  'convertToBlob' in OffscreenCanvas.prototype

const poolSize = canUseWorkers
  ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))
  : 0

let slots: Slot[] = []
let nextId = 1
let inlineBusy = 0
const pending = new Map<number, Pending>()
const listeners = new Set<() => void>()
let stats: PoolStats = { size: poolSize, busy: 0, mode: canUseWorkers ? 'workers' : 'main-thread' }

function emit() {
  const busy = canUseWorkers ? slots.reduce((n, s) => n + (s.busy > 0 ? 1 : 0), 0) : inlineBusy
  stats = { ...stats, busy }
  listeners.forEach((l) => l())
}

function ensureSlots() {
  if (slots.length || !canUseWorkers) return
  slots = Array.from({ length: poolSize }, () => {
    const worker = new Worker(new URL('../../workers/image.worker.ts', import.meta.url), {
      type: 'module',
    })
    const slot: Slot = { worker, busy: 0 }
    worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data
      const job = pending.get(id)
      pending.delete(id)
      slot.busy--
      emit()
      if (!job) return
      if (ok) job.resolve(result)
      else job.reject(new Error(error))
    }
    return slot
  })
}

export function runTransform(file: Blob, params: TransformParams): Promise<TransformResult> {
  if (!canUseWorkers) {
    inlineBusy++
    emit()
    return transformImage(file, params).finally(() => {
      inlineBusy--
      emit()
    })
  }

  ensureSlots()
  const slot = slots.reduce((a, b) => (b.busy < a.busy ? b : a))
  const id = nextId++
  slot.busy++
  emit()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    slot.worker.postMessage({ id, file, params })
  })
}

export const poolStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => stats,
}
