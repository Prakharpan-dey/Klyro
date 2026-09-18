import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { buildPlanRequest, requestPlan, type PlannerMode, type StagedForPlan } from '@/lib/plan/api'
import { checkPlan, executePlan, type StepProgress } from '@/lib/plan/execute'
import { runStep } from '@/lib/plan/runners'
import type { Plan } from '@/lib/plan/schema'
import type { OutputFile } from '@/ops/types'

export type PlannerPhase = 'idle' | 'planning' | 'planned' | 'running' | 'done' | 'error'

export interface PlannerState {
  phase: PlannerPhase
  plan?: Plan
  /** files the plan was made for, in index order */
  files: File[]
  bytesSent?: number
  mode?: PlannerMode
  steps: StepProgress[]
  results: OutputFile[]
  error?: string
  elapsedMs?: number
}

const initial: PlannerState = { phase: 'idle', files: [], steps: [], results: [] }

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(initial)
  const abort = useRef<AbortController | null>(null)

  const submit = useCallback(
    async (instruction: string, staged: StagedForPlan[], shareNames: boolean) => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      const files = staged.map((s) => s.file)
      setState({ ...initial, phase: 'planning', files })

      try {
        const req = buildPlanRequest(instruction, staged, shareNames)
        const { plan, bytesSent, mode } = await requestPlan(req, controller.signal)
        const problem = checkPlan(
          plan,
          req.files.map((f) => f.kind),
        )
        setState({
          ...initial,
          files,
          bytesSent,
          mode,
          plan: problem ? { ...plan, steps: [], clarification: problem } : plan,
          phase: 'planned',
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setState({
          ...initial,
          files,
          phase: 'error',
          error: err instanceof Error ? err.message : 'Planning failed',
        })
      }
    },
    [],
  )

  const run = useCallback(async () => {
    const { plan, files } = state
    if (!plan || !plan.steps.length) return
    const started = performance.now()
    setState((s) => ({ ...s, phase: 'running', results: [], error: undefined }))

    try {
      const results = await executePlan(plan, files, {
        runner: runStep,
        onStep: (index, progress) =>
          setState((s) => {
            const steps = [...s.steps]
            steps[index] = progress
            return { ...s, steps }
          }),
      })
      setState((s) => ({
        ...s,
        phase: 'done',
        results,
        elapsedMs: performance.now() - started,
      }))
      toast.success(`${results.length} file${results.length === 1 ? '' : 's'} ready`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Run failed'
      setState((s) => ({ ...s, phase: 'error', error: message }))
      toast.error(message)
    }
  }, [state])

  const reset = useCallback(() => {
    abort.current?.abort()
    setState(initial)
  }, [])

  return { ...state, submit, run, reset }
}
