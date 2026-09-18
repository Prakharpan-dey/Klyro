import type { OutputFile } from '@/ops/types'
import type { Plan, PlanStep } from './schema'

export type StepStatus = 'queued' | 'running' | 'done' | 'error'

export interface StepProgress {
  status: StepStatus
  ms?: number
  label?: string
  error?: string
}

/** Runs one step on its resolved input files. */
export type StepRunner = (
  step: PlanStep,
  inputs: File[],
  report: (label: string) => void,
) => Promise<OutputFile[]>

export type OpKind = 'image' | 'pdf'

/** Which file kind each op consumes. */
export const INPUT_KIND: Record<PlanStep['op'], OpKind> = {
  'image.compress': 'image',
  'image.resize': 'image',
  'image.convert': 'image',
  'pdf.merge': 'pdf',
  'pdf.split': 'pdf',
  'pdf.extract': 'pdf',
  'pdf.deletePages': 'pdf',
  'pdf.rotate': 'pdf',
  'pdf.reorder': 'pdf',
  'pdf.fromImages': 'image',
  'pdf.toImages': 'pdf',
}

export const OUTPUT_KIND: Record<PlanStep['op'], OpKind> = {
  ...INPUT_KIND,
  'pdf.fromImages': 'pdf',
  'pdf.toImages': 'image',
}

/**
 * Checks a plan against the files actually staged, before anything runs.
 * Returns a message for the first problem found.
 */
export function checkPlan(plan: Plan, fileKinds: ('image' | 'pdf' | 'other')[]): string | null {
  const stepKinds: OpKind[] = []
  for (const [i, step] of plan.steps.entries()) {
    const want = INPUT_KIND[step.op]
    for (const ref of step.inputs) {
      const [type, raw] = ref.split(':')
      const n = Number(raw)
      let kind: string | undefined
      if (type === 'file') {
        if (n >= fileKinds.length) return `Step ${i + 1} refers to a file that isn't staged`
        kind = fileKinds[n]
      } else {
        if (n < 1 || n > i) return `Step ${i + 1} uses the result of a later step`
        kind = stepKinds[n - 1]
      }
      if (kind !== want) return `Step ${i + 1} needs ${want === 'pdf' ? 'PDFs' : 'images'}`
    }
    stepKinds.push(OUTPUT_KIND[step.op])
  }
  return null
}

interface RunOptions {
  runner: StepRunner
  onStep: (index: number, progress: StepProgress) => void
}

/**
 * Executes steps in order. Returns the outputs of every step whose results were not
 * consumed by a later step — usually just the last one.
 */
export async function executePlan(plan: Plan, files: File[], { runner, onStep }: RunOptions) {
  const outputs: OutputFile[][] = []
  const consumed = new Set<number>()

  plan.steps.forEach((_, i) => onStep(i, { status: 'queued' }))

  for (const [i, step] of plan.steps.entries()) {
    const started = performance.now()
    onStep(i, { status: 'running' })

    const inputs = step.inputs.flatMap((ref) => {
      const [type, raw] = ref.split(':')
      const n = Number(raw)
      if (type === 'file') return [files[n]]
      consumed.add(n - 1)
      return outputs[n - 1].map((o) => o.file)
    })

    try {
      const result = await runner(step, inputs, (label) => onStep(i, { status: 'running', label }))
      outputs.push(result)
      onStep(i, { status: 'done', ms: performance.now() - started })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Step failed'
      onStep(i, { status: 'error', error: message, ms: performance.now() - started })
      throw new Error(`Step ${i + 1}: ${message}`)
    }
  }

  return outputs.filter((_, i) => !consumed.has(i)).flat()
}
