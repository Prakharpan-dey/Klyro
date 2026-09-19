import { z } from 'zod'

// Keep in sync with api/src/schema.ts

export const OPS = [
  // images
  'image.compress',
  'image.resize',
  'image.convert',
  'image.stripExif',
  // pdf — pages
  'pdf.merge',
  'pdf.split',
  'pdf.extract',
  'pdf.deletePages',
  'pdf.rotate',
  'pdf.reorder',
  'pdf.reverse',
  'pdf.insertBlank',
  'pdf.removeBlank',
  'pdf.alternateMix',
  // pdf — layout
  'pdf.crop',
  'pdf.nUp',
  'pdf.booklet',
  'pdf.divide',
  'pdf.fixSize',
  'pdf.overlay',
  // pdf — marks
  'pdf.watermark',
  'pdf.pageNumbers',
  'pdf.headerFooter',
  'pdf.bates',
  // pdf — conversion
  'pdf.fromImages',
  'pdf.toImages',
  'pdf.fromText',
  'pdf.toText',
  'pdf.toDocx',
  'pdf.toExcel',
  'pdf.fromExcel',
  'pdf.ocr',
  // pdf — size and health
  'pdf.compress',
  'pdf.rasterize',
  'pdf.repair',
  'pdf.linearize',
  'pdf.flatten',
  // pdf — privacy
  'pdf.strip',
  'pdf.removeAnnotations',
  'pdf.setMetadata',
  // video
  'video.compress',
  'video.convert',
  'video.trim',
  'video.extractAudio',
] as const

export const LIMITS = {
  instruction: 500,
  files: 20,
  steps: 8,
  bodyBytes: 8 * 1024,
}

export const planFileSchema = z.object({
  index: z.number().int().min(0),
  kind: z.enum(['image', 'pdf', 'video', 'other']),
  mime: z.string().max(100),
  sizeKB: z.number().min(0),
  pages: z.number().int().min(1).optional(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  // videos only: a target size cannot be turned into a bitrate without a duration
  durationSec: z.number().min(0).optional(),
  hasAudio: z.boolean().optional(),
  name: z.string().max(200).optional(),
})

export const planRequestSchema = z.object({
  instruction: z.string().trim().min(1).max(LIMITS.instruction),
  files: z.array(planFileSchema).max(LIMITS.files),
})

/**
 * One flat bag shared by every operation. Keys are reused across operations wherever the
 * meaning is the same, because the whole object is sent to the model as a JSON schema on
 * every request and each key costs tokens.
 */
export const stepParamsSchema = z
  .object({
    // sizes and quality
    targetKB: z.number().positive().max(100_000),
    targetMB: z.number().positive().max(10_000),
    quality: z.number().min(1).max(100),
    format: z.enum(['jpeg', 'png', 'webp']),
    lossless: z.boolean(),
    // image geometry
    unit: z.enum(['px', 'percent', 'cm']),
    width: z.number().positive(),
    height: z.number().positive(),
    percent: z.number().positive().max(1000),
    dpi: z.number().int().min(36).max(1200),
    keepAspect: z.boolean(),
    // page selection
    ranges: z.string().max(200),
    everyN: z.number().int().min(1),
    pages: z.string().max(200),
    order: z.string().max(400),
    positions: z.string().max(200),
    where: z.enum(['before', 'after']),
    count: z.number().int().min(1).max(20),
    step: z.number().int().min(1).max(10),
    reverseSecond: z.boolean(),
    thresholdPercent: z.number().min(0).max(100),
    degrees: z.union([z.literal(90), z.literal(180), z.literal(270)]),
    // sheets and layout
    pageSize: z.enum(['a4', 'letter', 'fit']),
    orientation: z.enum(['auto', 'portrait', 'landscape']),
    landscape: z.boolean(),
    marginMm: z.number().min(0).max(50),
    gapMm: z.number().min(0).max(50),
    perSheet: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(9)]),
    divideMode: z.enum(['vertical', 'horizontal', 'quarters']),
    /** margins to cut away, "top,right,bottom,left" in millimetres */
    cropMm: z.string().max(40),
    scale: z.number().positive().max(4),
    mode: z.enum(['first', 'sequence']),
    // text stamps
    text: z.string().max(500),
    template: z.string().max(200),
    anchor: z.enum([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'center',
    ]),
    family: z.enum(['helvetica', 'times', 'courier']),
    fontSize: z.number().min(4).max(200),
    opacity: z.number().min(0).max(1),
    tile: z.boolean(),
    tilt: z.number().min(-90).max(90),
    prefix: z.string().max(40),
    start: z.number().int().min(0).max(1_000_000),
    digits: z.number().int().min(1).max(10),
    skip: z.number().int().min(0).max(100),
    // conversion
    shape: z.enum(['joined', 'per-page']),
    pageMarkers: z.boolean(),
    sheetPerPage: z.boolean(),
    filter: z.enum(['none', 'grayscale', 'invert', 'contrast']),
    language: z.enum(['eng', 'hin', 'eng+hin']),
    output: z.enum(['searchable', 'text']),
    // document info
    title: z.string().max(200),
    author: z.string().max(200),
    subject: z.string().max(200),
    keywords: z.string().max(200),
    // video
    container: z.enum(['mp4', 'webm']),
    startSec: z.number().min(0),
    endSec: z.number().min(0),
    heightPx: z.number().int().min(0).max(4320),
    tier: z.enum(['small', 'balanced', 'high']),
    muted: z.boolean(),
    // output naming
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
  // some models omit the field instead of sending null
  clarification: z
    .string()
    .max(300)
    .nullish()
    .transform((v) => v ?? null),
  steps: z.array(planStepSchema).max(LIMITS.steps),
})

export type PlanRequest = z.infer<typeof planRequestSchema>
export type PlanFile = z.infer<typeof planFileSchema>
export type Plan = z.infer<typeof planSchema>
export type PlanStep = z.infer<typeof planStepSchema>
export type PlanOp = PlanStep['op']
export type StepParams = z.infer<typeof stepParamsSchema>

/** Params without which a step cannot mean anything. The schema cannot express this. */
const REQUIRED: Partial<Record<PlanOp, (keyof StepParams)[]>> = {
  'pdf.extract': ['pages'],
  'pdf.deletePages': ['pages'],
  'pdf.reorder': ['order'],
  'pdf.insertBlank': ['positions'],
  'pdf.crop': ['cropMm'],
  'pdf.nUp': ['perSheet'],
  'pdf.divide': ['divideMode'],
  'pdf.watermark': ['text'],
  'pdf.headerFooter': ['template'],
  'pdf.fromText': ['text'],
  'video.trim': ['startSec', 'endSec'],
}

/** Operations needing at least one of a set, where any single one is enough. */
const EITHER: Partial<Record<PlanOp, (keyof StepParams)[]>> = {
  'pdf.split': ['ranges', 'everyN'],
  'image.resize': ['width', 'height', 'percent'],
}

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

/** The params bag is shared by every op, so only this can tell a step is missing its own. */
export function checkParams(plan: Plan): string | null {
  for (const [i, step] of plan.steps.entries()) {
    for (const key of REQUIRED[step.op] ?? []) {
      if (step.params[key] === undefined) return `Step ${i + 1} (${step.op}) is missing ${key}`
    }
    const either = EITHER[step.op]
    if (either && !either.some((key) => step.params[key] !== undefined)) {
      return `Step ${i + 1} (${step.op}) needs one of ${either.join(', ')}`
    }
  }
  return null
}
