import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { planWithMock } from './mock'
import { handler } from './plan'
import { validatePlan } from './planner'
import { SUBMIT_PLAN_TOOL, SYSTEM_PROMPT, userMessage } from './prompt'
import {
  OPS,
  checkParams,
  checkRefs,
  planRequestSchema,
  stepParamsSchema,
  type PlanRequest,
} from './schema'

const pdfs: PlanRequest['files'] = [
  { index: 0, kind: 'pdf', mime: 'application/pdf', sizeKB: 2100, pages: 4 },
  { index: 1, kind: 'pdf', mime: 'application/pdf', sizeKB: 880, pages: 2 },
]

async function call(body: unknown) {
  const event = { body: JSON.stringify(body), isBase64Encoded: false } as APIGatewayProxyEventV2
  const res = (await handler(event)) as APIGatewayProxyStructuredResultV2
  return { status: res.statusCode, body: JSON.parse(res.body as string) }
}

describe('request validation', () => {
  it('rejects long instructions and too many files', () => {
    expect(planRequestSchema.safeParse({ instruction: 'x'.repeat(501), files: [] }).success).toBe(
      false,
    )
    const files = Array.from({ length: 21 }, (_, index) => ({ ...pdfs[0], index }))
    expect(planRequestSchema.safeParse({ instruction: 'merge', files }).success).toBe(false)
  })

  it('rejects unknown file fields types', () => {
    expect(
      planRequestSchema.safeParse({ instruction: 'merge', files: [{ ...pdfs[0], sizeKB: 'big' }] })
        .success,
    ).toBe(false)
  })
})

describe('plan validation', () => {
  it('accepts a plan whose clarification field is missing', () => {
    const plan = validatePlan(
      { summary: 'Merge', steps: [{ op: 'pdf.merge', inputs: ['file:0'], params: {} }] },
      1,
    )
    expect(plan.clarification).toBeNull()
  })

  it('accepts a chained plan', () => {
    const plan = validatePlan(
      {
        summary: 'Merge then drop page 3',
        clarification: null,
        steps: [
          { op: 'pdf.merge', inputs: ['file:0', 'file:1'], params: {} },
          { op: 'pdf.deletePages', inputs: ['step:1'], params: { pages: '3' } },
        ],
      },
      2,
    )
    expect(plan.steps).toHaveLength(2)
  })

  it('rejects unknown ops and params', () => {
    const base = { summary: 's', clarification: null }
    expect(() =>
      validatePlan({ ...base, steps: [{ op: 'file.upload', inputs: ['file:0'], params: {} }] }, 1),
    ).toThrow(/invalid plan/)
    expect(() =>
      validatePlan(
        { ...base, steps: [{ op: 'pdf.merge', inputs: ['file:0'], params: { url: 'http://x' } }] },
        1,
      ),
    ).toThrow(/invalid plan/)
  })

  it('rejects refs to missing files or later steps', () => {
    const plan = {
      summary: 's',
      clarification: null,
      steps: [{ op: 'pdf.merge' as const, inputs: ['file:3'], params: {} }],
    }
    expect(checkRefs(plan, 2)).toMatch(/file 3/)
    expect(
      checkRefs({ ...plan, steps: [{ op: 'pdf.merge', inputs: ['step:1'], params: {} }] }, 2),
    ).toMatch(/before it runs/)
  })

  it('requires either steps or a clarification', () => {
    expect(checkRefs({ summary: 's', clarification: null, steps: [] }, 1)).toMatch(/no steps/)
    expect(checkRefs({ summary: 's', clarification: 'Which file?', steps: [] }, 1)).toBeNull()
  })
})

describe('prompt', () => {
  it('only includes file names when provided', () => {
    const msg = userMessage({ instruction: 'merge', files: pdfs })
    expect(msg).toContain('file:0, pdf, application/pdf, 2100 KB, 4 pages')
    expect(msg).not.toContain('name')
    expect(userMessage({ instruction: 'merge', files: [{ ...pdfs[0], name: 'a.pdf' }] })).toContain(
      'name "a.pdf"',
    )
  })
})

describe('tool spec', () => {
  it('describes the plan shape as an openai function tool', () => {
    const schema = SUBMIT_PLAN_TOOL.function.parameters as Record<string, any>
    expect(SUBMIT_PLAN_TOOL.function.name).toBe('submit_plan')
    expect(schema.required).toEqual(['summary', 'clarification', 'steps'])
    const pattern = new RegExp(schema.properties.steps.items.properties.inputs.items.pattern)
    expect(pattern.test('file:0')).toBe(true)
    expect(pattern.test('step:12')).toBe(true)
    expect(pattern.test('filed')).toBe(false)
  })

  it('offers every op the executor implements', () => {
    const schema = SUBMIT_PLAN_TOOL.function.parameters as Record<string, any>
    expect(schema.properties.steps.items.properties.op.enum).toEqual([...OPS])
  })

  it('describes every op it offers, so the model is never told only a name', () => {
    for (const op of OPS) expect(SYSTEM_PROMPT, op).toContain(`- ${op} `)
  })

  it('declares a json schema for every param the zod schema accepts', () => {
    const schema = SUBMIT_PLAN_TOOL.function.parameters as Record<string, any>
    const declared = Object.keys(schema.properties.steps.items.properties.params.properties)
    const accepted = Object.keys(stepParamsSchema.shape)
    expect(declared.sort()).toEqual(accepted.sort())
  })

  it('refuses to plan anything needing a password', () => {
    expect(SYSTEM_PROMPT).toMatch(/Never plan a step that needs a password/)
    expect(SYSTEM_PROMPT).not.toMatch(/There is no PDF compression/)
  })
})

describe('mock planner', () => {
  it('chains merge and delete', () => {
    const plan = planWithMock({ instruction: 'merge these, remove page 3', files: pdfs })
    expect(plan.steps.map((s) => s.op)).toEqual(['pdf.merge', 'pdf.deletePages'])
    expect(plan.steps[1].inputs).toEqual(['step:1'])
  })

  it('asks for files when none are staged', () => {
    expect(planWithMock({ instruction: 'compress', files: [] }).clarification).toBeTruthy()
  })

  it('plans a PDF size target instead of refusing it', () => {
    const plan = planWithMock({ instruction: 'merge these and compress to 500kb', files: pdfs })
    expect(plan.steps.map((s) => s.op)).toEqual(['pdf.merge', 'pdf.compress'])
    expect(plan.steps[1].params.targetKB).toBe(500)
    expect(plan.clarification).toBeNull()
  })

  it('plans video work now that a clip is not simply "other"', () => {
    const plan = planWithMock({
      instruction: 'trim to the first 10 seconds and shrink to 8mb',
      files: [{ index: 0, kind: 'video', mime: 'video/mp4', sizeKB: 40_000, durationSec: 62 }],
    })
    expect(plan.steps.map((s) => s.op)).toEqual(['video.trim', 'video.compress'])
    expect(plan.steps[1].inputs).toEqual(['step:1'])
  })
})

describe('checkParams', () => {
  const plan = (steps: Parameters<typeof checkParams>[0]['steps']) => ({
    summary: 's',
    clarification: null,
    steps,
  })

  it('rejects a step missing the param that gives it meaning', () => {
    expect(
      checkParams(plan([{ op: 'pdf.extract', inputs: ['file:0'], params: {} }])),
    ).toMatch(/missing pages/)
  })

  it('passes a complete step', () => {
    expect(
      checkParams(plan([{ op: 'pdf.extract', inputs: ['file:0'], params: { pages: '1-2' } }])),
    ).toBeNull()
  })

  it('is enforced by validatePlan, not only exported', () => {
    expect(() =>
      validatePlan(
        { summary: 's', clarification: null, steps: [{ op: 'pdf.watermark', inputs: ['file:0'], params: {} }] },
        1,
      ),
    ).toThrow(/missing text/)
  })
})

describe('handler', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_PLANNER', '1')
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('returns a plan', async () => {
    const res = await call({ instruction: 'merge these, remove page 3', files: pdfs })
    expect(res.status).toBe(200)
    expect(res.body.plan.steps).toHaveLength(2)
  })

  it('never logs the instruction or file names', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await call({
      instruction: 'merge secret-contract please',
      files: [{ ...pdfs[0], name: 'salary.pdf' }, pdfs[1]],
    })
    const output = log.mock.calls.flat().join(' ')
    expect(output).not.toContain('secret-contract')
    expect(output).not.toContain('salary')
  })

  it('rejects bad input', async () => {
    expect((await call({ instruction: '' })).status).toBe(400)
    const event = { body: 'not json', isBase64Encoded: false } as APIGatewayProxyEventV2
    expect(((await handler(event)) as APIGatewayProxyStructuredResultV2).statusCode).toBe(400)
  })

  it('rejects oversized bodies', async () => {
    const res = await call({ instruction: 'x', files: [], pad: 'y'.repeat(9000) })
    expect(res.status).toBe(413)
  })
})
