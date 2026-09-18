import { z } from 'zod'

// Keep in sync with api/src/schema.ts

export const OPS = [
  'image.compress',
  'image.resize',
  'image.convert',
  'pdf.merge',
  'pdf.split',
  'pdf.extract',
  'pdf.deletePages',
  'pdf.rotate',
  'pdf.reorder',
  'pdf.fromImages',
  'pdf.toImages',
] as const

export const LIMITS = {
  instruction: 500,
  files: 20,
  steps: 8,
  bodyBytes: 8 * 1024,
}

export const planFileSchema = z.object({
  index: z.number().int().min(0),
  kind: z.enum(['image', 'pdf', 'other']),
  mime: z.string().max(100),
  sizeKB: z.number().min(0),
  pages: z.number().int().min(1).optional(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  name: z.string().max(200).optional(),
})

export const planRequestSchema = z.object({
  instruction: z.string().trim().min(1).max(LIMITS.instruction),
  files: z.array(planFileSchema).max(LIMITS.files),
})

export const stepParamsSchema = z
  .object({
    targetKB: z.number().positive().max(100_000),
    quality: z.number().min(1).max(100),
    format: z.enum(['jpeg', 'png', 'webp']),
    unit: z.enum(['px', 'percent', 'cm']),
    width: z.number().positive(),
    height: z.number().positive(),
    percent: z.number().positive().max(1000),
    dpi: z.number().int().min(36).max(1200),
    keepAspect: z.boolean(),
    ranges: z.string().max(200),
    everyN: z.number().int().min(1),
    pages: z.string().max(200),
    degrees: z.union([z.literal(90), z.literal(180), z.literal(270)]),
    order: z.string().max(400),
    pageSize: z.enum(['a4', 'letter', 'fit']),
    orientation: z.enum(['auto', 'portrait', 'landscape']),
    marginMm: z.number().min(0).max(50),
    name: z.string().max(80),
  })
  .partial()
  .strict()

export const planStepSchema = z.object({
  op: z.enum(OPS),
  inputs: z
    .array(z.string().regex(/^(file|step):\d+$/))
    .min(1)
    .max(LIMITS.files),
  params: stepParamsSchema.default({}),
})

export const planSchema = z.object({
  summary: z.string().max(300),
  clarification: z.string().max(300).nullable(),
  steps: z.array(planStepSchema).max(LIMITS.steps),
})

export type PlanRequest = z.infer<typeof planRequestSchema>
export type PlanFile = z.infer<typeof planFileSchema>
export type Plan = z.infer<typeof planSchema>
export type PlanStep = z.infer<typeof planStepSchema>

/** Semantic checks the schema can't express: refs must point at real files or earlier steps. */
export function checkRefs(plan: Plan, fileCount: number): string | null {
  for (const [i, step] of plan.steps.entries()) {
    for (const ref of step.inputs) {
      const [kind, raw] = ref.split(':')
      const n = Number(raw)
      if (kind === 'file' && n >= fileCount)
        return `Step ${i + 1} uses file ${n}, which doesn't exist`
      if (kind === 'step' && (n < 1 || n > i)) return `Step ${i + 1} uses step ${n} before it runs`
    }
  }
  if (!plan.steps.length && !plan.clarification) return 'Plan has no steps and no question'
  return null
}
