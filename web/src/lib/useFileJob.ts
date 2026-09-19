import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { OutputFile, Progress } from '@/ops/types'

export type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'

export interface JobState {
  status: JobStatus
  done: number
  total: number
  label: string
  startedAt?: number
  elapsedMs?: number
  results: OutputFile[]
  error?: string
}

const initial: JobState = { status: 'idle', done: 0, total: 0, label: '', results: [] }

export function useFileJob() {
  const [state, setState] = useState<JobState>(initial)
  const running = useRef(false)
  const controller = useRef<AbortController | null>(null)

  const run = useCallback(
    async (task: (progress: Progress, signal: AbortSignal) => Promise<OutputFile[]>) => {
      if (running.current) return
      running.current = true
      const startedAt = performance.now()
      controller.current = new AbortController()
      setState({ ...initial, status: 'running', startedAt })

      const progress: Progress = (done, total, label) =>
        setState((s) => ({ ...s, done, total, label }))

      try {
        const results = await task(progress, controller.current.signal)
        const elapsedMs = performance.now() - startedAt
        setState((s) => ({ ...s, status: 'done', results, elapsedMs, done: s.total }))
        const warned = results.filter((r) => r.warning).length
        if (warned) toast.warning(`${results.length - warned} done, ${warned} need a look`)
        else toast.success(`${results.length} file${results.length === 1 ? '' : 's'} ready`)
      } catch (err) {
        // stopping on purpose is not a failure, so it is reported as neither
        if (controller.current?.signal.aborted) {
          setState((s) => ({ ...s, status: 'cancelled', label: '' }))
          toast('Stopped')
        } else {
          const message = err instanceof Error ? err.message : 'Something went wrong'
          setState((s) => ({ ...s, status: 'error', error: message }))
          toast.error(message)
        }
      } finally {
        running.current = false
        controller.current = null
      }
    },
    [],
  )

  const cancel = useCallback(() => controller.current?.abort(), [])
  const reset = useCallback(() => setState(initial), [])

  return { ...state, run, cancel, reset }
}
