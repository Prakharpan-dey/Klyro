import { describe, expect, it } from 'vitest'
import type { OutputFile } from '@/ops/types'
import { buildPlanRequest } from './api'
import { describeStep } from './describe'
import { checkPlan, executePlan, type StepProgress, type StepRunner } from './execute'
import { OPS, type Plan, type PlanStep } from './schema'

const file = (name: string, type: string) => new File(['x'], name, { type })
const out = (name: string): OutputFile => ({
  file: file(name, 'application/pdf'),
  sourceName: '',
  sourceSize: 1,
})

const mergeThenDelete: Plan = {
  summary: 'Merge and drop page 3',
  clarification: null,
  steps: [
    { op: 'pdf.merge', inputs: ['file:0', 'file:1'], params: {} },
    { op: 'pdf.deletePages', inputs: ['step:1'], params: { pages: '3' } },
  ],
}

describe('checkPlan', () => {
  it('accepts matching kinds and chained steps', () => {
    expect(checkPlan(mergeThenDelete, ['pdf', 'pdf'])).toBeNull()
  })

  it('rejects ops on the wrong kind of file', () => {
    expect(checkPlan(mergeThenDelete, ['pdf', 'image'])).toMatch(/needs PDFs/)
  })

  it('tracks output kinds across steps', () => {
    const plan: Plan = {
      summary: '',
      clarification: null,
      steps: [
        { op: 'pdf.toImages', inputs: ['file:0'], params: {} },
        { op: 'image.compress', inputs: ['step:1'], params: { targetKB: 100 } },
      ],
    }
    expect(checkPlan(plan, ['pdf'])).toBeNull()
    const bad = { ...plan, steps: [plan.steps[0], { ...plan.steps[1], op: 'pdf.merge' as const }] }
    expect(checkPlan(bad, ['pdf'])).toMatch(/needs PDFs/)
  })

  it('rejects missing files', () => {
    expect(checkPlan(mergeThenDelete, ['pdf'])).toMatch(/isn't staged/)
  })

  it('keeps video work off images and vice versa', () => {
    const shrink: Plan = {
      summary: '',
      clarification: null,
      steps: [{ op: 'video.compress', inputs: ['file:0'], params: { targetMB: 8 } }],
    }
    expect(checkPlan(shrink, ['video'])).toBeNull()
    expect(checkPlan(shrink, ['pdf'])).toMatch(/needs videos/)
  })

  it('lets an op that cannot tell the kind from metadata take anything', () => {
    const ocr: Plan = {
      summary: '',
      clarification: null,
      steps: [{ op: 'pdf.ocr', inputs: ['file:0'], params: {} }],
    }
    expect(checkPlan(ocr, ['pdf'])).toBeNull()
    expect(checkPlan(ocr, ['image'])).toBeNull()
  })

  it('stops a chain at an output nothing can consume', () => {
    const plan: Plan = {
      summary: '',
      clarification: null,
      steps: [
        { op: 'pdf.toText', inputs: ['file:0'], params: {} },
        { op: 'pdf.merge', inputs: ['step:1'], params: {} },
      ],
    }
    expect(checkPlan(plan, ['pdf'])).toMatch(/needs PDFs/)
  })
})

describe('executePlan', () => {
  it('feeds step outputs forward and returns only the final results', async () => {
    const seen: string[][] = []
    const runner: StepRunner = async (step, inputs) => {
      seen.push(inputs.map((f) => f.name))
      return step.op === 'pdf.merge' ? [out('merged.pdf')] : [out('merged-edited.pdf')]
    }
    const progress: StepProgress[] = []
    const results = await executePlan(
      mergeThenDelete,
      [file('a.pdf', 'application/pdf'), file('b.pdf', 'application/pdf')],
      { runner, onStep: (i, p) => (progress[i] = p) },
    )
    expect(seen).toEqual([['a.pdf', 'b.pdf'], ['merged.pdf']])
    expect(results.map((r) => r.file.name)).toEqual(['merged-edited.pdf'])
    expect(progress.map((p) => p.status)).toEqual(['done', 'done'])
  })

  it('keeps results of independent steps', async () => {
    const plan: Plan = {
      summary: '',
      clarification: null,
      steps: [
        { op: 'image.compress', inputs: ['file:0'], params: { targetKB: 50 } },
        { op: 'pdf.merge', inputs: ['file:1', 'file:2'], params: {} },
      ],
    }
    const runner: StepRunner = async (step) => [out(step.op)]
    const results = await executePlan(plan, [file('a', ''), file('b', ''), file('c', '')], {
      runner,
      onStep: () => {},
    })
    expect(results.map((r) => r.file.name)).toEqual(['image.compress', 'pdf.merge'])
  })

  it('stops at the failing step and marks it', async () => {
    const progress: StepProgress[] = []
    const runner: StepRunner = async (step) => {
      if (step.op === 'pdf.deletePages') throw new Error('Page 3 is past the end')
      return [out('merged.pdf')]
    }
    await expect(
      executePlan(mergeThenDelete, [file('a', ''), file('b', '')], {
        runner,
        onStep: (i, p) => (progress[i] = p),
      }),
    ).rejects.toThrow('Step 2: Page 3 is past the end')
    expect(progress[1].status).toBe('error')
  })
})

describe('buildPlanRequest', () => {
  const staged = [
    {
      file: file('salary-slip.pdf', 'application/pdf'),
      meta: { kind: 'pdf' as const, mime: 'application/pdf', size: 1, pages: 2 },
    },
  ]

  it('tells the planner how long a clip runs, and whether it has sound', () => {
    const clip = [
      {
        file: file('holiday.mp4', 'video/mp4'),
        meta: {
          kind: 'video' as const,
          mime: 'video/mp4',
          size: 1,
          durationSec: 62.4,
          hasAudio: true,
        },
      },
    ]
    const req = buildPlanRequest('shrink it', clip, false)
    expect(req.files[0]).toMatchObject({ kind: 'video', durationSec: 62, hasAudio: true })
    expect(JSON.stringify(req)).not.toContain('holiday')
  })

  it('leaves out file names unless allowed', () => {
    const req = buildPlanRequest('  merge  ', staged, false)
    expect(req).toEqual({
      instruction: 'merge',
      files: [{ index: 0, kind: 'pdf', mime: 'application/pdf', sizeKB: 0, pages: 2 }],
    })
    expect(JSON.stringify(req)).not.toContain('salary')
    expect(buildPlanRequest('merge', staged, true).files[0].name).toBe('salary-slip.pdf')
  })
})

describe('describeStep', () => {
  it('has a line for every operation, with no placeholder left in it', () => {
    const params: Partial<Record<PlanStep['op'], PlanStep['params']>> = {
      'pdf.extract': { pages: '1' },
      'pdf.deletePages': { pages: '1' },
      'pdf.reorder': { order: '1' },
      'pdf.insertBlank': { positions: '1' },
      'pdf.crop': { cropMm: '10' },
      'pdf.watermark': { text: 'DRAFT' },
      'pdf.headerFooter': { template: '{n}' },
      'pdf.fromText': { text: 'hi' },
      'video.trim': { startSec: 0, endSec: 10 },
    }
    for (const op of OPS) {
      const line = describeStep({ op, inputs: ['file:0'], params: params[op] ?? {} }, ['a.pdf'])
      expect(line, op).toBeTruthy()
      expect(line, op).not.toContain('undefined')
      expect(line, op).not.toBe(op)
    }
  })

  it('reads naturally', () => {
    const names = ['a.pdf', 'b.pdf']
    expect(describeStep(mergeThenDelete.steps[0], names)).toBe('Merge 2 files into one PDF')
    expect(describeStep(mergeThenDelete.steps[1], names)).toBe(
      'Delete page 3 from the result of step 1',
    )
    expect(
      describeStep({ op: 'image.compress', inputs: ['file:1'], params: { targetKB: 200 } }, names),
    ).toBe('Compress b.pdf to ≤ 200 KB')
    expect(
      describeStep({ op: 'pdf.compress', inputs: ['file:0'], params: { targetKB: 500 } }, names),
    ).toBe('Compress a.pdf to ≤ 500 KB')
    expect(
      describeStep(
        { op: 'video.trim', inputs: ['file:0'], params: { startSec: 0, endSec: 10 } },
        names,
      ),
    ).toBe('Trim a.pdf to 0s-10s')
  })
})
