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

export type OpKind = 'image' | 'pdf' | 'video' | 'other'
/** 'any' means the op does not care, because the kind cannot be told apart from metadata. */
type InputKind = OpKind | 'any'

const KIND_LABEL: Record<OpKind, string> = {
  image: 'images',
  pdf: 'PDFs',
  video: 'videos',
  other: 'files of another kind',
}

/** Which file kind each op consumes. */
export const INPUT_KIND: Record<PlanStep['op'], InputKind> = {
  'image.compress': 'image',
  'image.resize': 'image',
  'image.convert': 'image',
  'image.stripExif': 'image',
  'pdf.merge': 'pdf',
  'pdf.split': 'pdf',
  'pdf.extract': 'pdf',
  'pdf.deletePages': 'pdf',
  'pdf.rotate': 'pdf',
  'pdf.reorder': 'pdf',
  'pdf.reverse': 'pdf',
  'pdf.insertBlank': 'pdf',
  'pdf.removeBlank': 'pdf',
  'pdf.alternateMix': 'pdf',
  'pdf.crop': 'pdf',
  'pdf.nUp': 'pdf',
  'pdf.booklet': 'pdf',
  'pdf.divide': 'pdf',
  'pdf.fixSize': 'pdf',
  'pdf.overlay': 'pdf',
  'pdf.watermark': 'pdf',
  'pdf.pageNumbers': 'pdf',
  'pdf.headerFooter': 'pdf',
  'pdf.bates': 'pdf',
  'pdf.fromImages': 'image',
  'pdf.toImages': 'pdf',
  // takes nothing: the text comes from the instruction
  'pdf.fromText': 'any',
  'pdf.toText': 'pdf',
  'pdf.toDocx': 'pdf',
  'pdf.toExcel': 'pdf',
  // a spreadsheet is staged as 'other', which is indistinguishable from anything else
  'pdf.fromExcel': 'any',
  // reads a scan, which may arrive as a PDF or as an image
  'pdf.ocr': 'any',
  'pdf.compress': 'pdf',
  'pdf.rasterize': 'pdf',
  'pdf.repair': 'pdf',
  'pdf.linearize': 'pdf',
  'pdf.flatten': 'pdf',
  'pdf.strip': 'pdf',
  'pdf.removeAnnotations': 'pdf',
  'pdf.setMetadata': 'pdf',
  'video.compress': 'video',
  'video.convert': 'video',
  'video.trim': 'video',
  'video.extractAudio': 'video',
}

/** What each op hands on. 'other' is a dead end: nothing can be chained from it. */
export const OUTPUT_KIND: Record<PlanStep['op'], OpKind> = {
  ...(INPUT_KIND as Record<PlanStep['op'], OpKind>),
  'pdf.fromImages': 'pdf',
  'pdf.toImages': 'image',
  'pdf.fromText': 'pdf',
  'pdf.fromExcel': 'pdf',
  'pdf.toText': 'other',
  'pdf.toDocx': 'other',
  'pdf.toExcel': 'other',
  'pdf.ocr': 'pdf',
  'video.extractAudio': 'other',
}

/**
 * Checks a plan against the files actually staged, before anything runs.
 * Returns a message for the first problem found.
 */
export function checkPlan(plan: Plan, fileKinds: (OpKind | 'video')[]): string | null {
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
      if (want !== 'any' && kind !== want) return `Step ${i + 1} needs ${KIND_LABEL[want]}`
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
