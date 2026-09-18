import { describe, expect, it } from 'vitest'
import type { OutputFile } from '@/ops/types'
import { buildPlanRequest } from './api'
import { describeStep } from './describe'
import { checkPlan, executePlan, type StepProgress, type StepRunner } from './execute'
import type { Plan } from './schema'

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
  it('reads naturally', () => {
    const names = ['a.pdf', 'b.pdf']
    expect(describeStep(mergeThenDelete.steps[0], names)).toBe('Merge 2 files into one PDF')
    expect(describeStep(mergeThenDelete.steps[1], names)).toBe(
      'Delete page 3 from the result of step 1',
    )
    expect(
      describeStep({ op: 'image.compress', inputs: ['file:1'], params: { targetKB: 200 } }, names),
    ).toBe('Compress b.pdf to ≤ 200 KB')
  })
})
