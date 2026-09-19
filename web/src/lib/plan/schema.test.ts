import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { OPS, checkParams, planStepSchema, type Plan, type PlanStep } from './schema'
import { INPUT_KIND, OUTPUT_KIND } from './execute'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * The browser and the API validate the same plans, so the two schema files are copies of one
 * another. They have silently drifted by eleven operations before; a comment did not stop it.
 */
describe('schema mirroring', () => {
  it('is byte-identical to the API copy apart from the pointer comment', () => {
    const web = readFileSync(here('./schema.ts'), 'utf8')
    const api = readFileSync(here('../../../../api/src/schema.ts'), 'utf8')

    const strip = (source: string) => source.replace(/^\/\/ Keep in sync with .*$/m, '')
    expect(strip(web)).toBe(strip(api))
  })
})

const plan = (steps: PlanStep[]): Plan => ({ summary: 's', clarification: null, steps })
const step = (op: PlanStep['op'], params: PlanStep['params'] = {}): PlanStep => ({
  op,
  inputs: ['file:0'],
  params,
})

describe('the operation catalogue', () => {
  it('gives every operation an input and an output kind', () => {
    for (const op of OPS) {
      expect(INPUT_KIND[op], op).toBeDefined()
      expect(OUTPUT_KIND[op], op).toBeDefined()
    }
  })

  it('has no operation that would carry a password off the device', () => {
    const named = OPS as readonly string[]
    expect(named).not.toContain('pdf.encrypt')
    expect(named).not.toContain('pdf.decrypt')
    expect(named).not.toContain('pdf.sign')
  })

  it('accepts a realistic step for each operation', () => {
    const sample: Record<PlanStep['op'], PlanStep['params']> = {
      'image.compress': { targetKB: 200 },
      'image.resize': { unit: 'px', width: 800 },
      'image.convert': { format: 'webp' },
      'image.stripExif': {},
      'pdf.merge': { name: 'bundle' },
      'pdf.split': { ranges: '1-3, 4-' },
      'pdf.extract': { pages: '2, 5-7' },
      'pdf.deletePages': { pages: '1' },
      'pdf.rotate': { degrees: 270, pages: '1-2' },
      'pdf.reorder': { order: '3, 1, 2' },
      'pdf.reverse': {},
      'pdf.insertBlank': { positions: '1, 3', where: 'after', count: 2 },
      'pdf.removeBlank': { thresholdPercent: 0.5 },
      'pdf.alternateMix': { reverseSecond: true, step: 1 },
      'pdf.crop': { cropMm: '10,10,10,10' },
      'pdf.nUp': { perSheet: 4, pageSize: 'a4', gapMm: 4 },
      'pdf.booklet': { pageSize: 'letter' },
      'pdf.divide': { divideMode: 'quarters' },
      'pdf.fixSize': { pageSize: 'a4', orientation: 'portrait' },
      'pdf.overlay': { mode: 'first', opacity: 0.4, scale: 1 },
      'pdf.watermark': { text: 'DRAFT', opacity: 0.2, tilt: 45, tile: true },
      'pdf.pageNumbers': { template: 'Page {n} of {total}', start: 1, skip: 1 },
      'pdf.headerFooter': { template: '{n}', anchor: 'bottom-right' },
      'pdf.bates': { prefix: 'ABC', start: 1, digits: 6 },
      'pdf.fromImages': { pageSize: 'fit' },
      'pdf.toImages': { format: 'png', dpi: 200 },
      'pdf.fromText': { text: 'hello', pageSize: 'a4' },
      'pdf.toText': { shape: 'per-page' },
      'pdf.toDocx': {},
      'pdf.toExcel': { sheetPerPage: true },
      'pdf.fromExcel': { landscape: true },
      'pdf.ocr': { language: 'eng+hin', output: 'searchable', dpi: 200 },
      'pdf.compress': { targetKB: 500, filter: 'grayscale' },
      'pdf.rasterize': { dpi: 150, lossless: true },
      'pdf.repair': {},
      'pdf.linearize': {},
      'pdf.flatten': {},
      'pdf.strip': {},
      'pdf.removeAnnotations': {},
      'pdf.setMetadata': { title: 'Report', author: 'Nobody' },
      'video.compress': { targetMB: 8, heightPx: 720, muted: false, container: 'mp4' },
      'video.convert': { container: 'webm' },
      'video.trim': { startSec: 0, endSec: 10 },
      'video.extractAudio': {},
    }

    for (const op of OPS) {
      const parsed = planStepSchema.safeParse(step(op, sample[op]))
      expect(parsed.success, `${op}: ${parsed.error?.message}`).toBe(true)
    }
    // every op is covered above, so a new one cannot be added without a sample
    expect(Object.keys(sample).sort()).toEqual([...OPS].sort())
  })

  it('rejects a param no operation declares', () => {
    expect(planStepSchema.safeParse(step('pdf.merge', { nonsense: 1 } as never)).success).toBe(
      false,
    )
  })
})

describe('checkParams', () => {
  it('rejects a step missing the param that gives it meaning', () => {
    expect(checkParams(plan([step('pdf.extract')]))).toMatch(/missing pages/)
    expect(checkParams(plan([step('pdf.watermark')]))).toMatch(/missing text/)
    expect(checkParams(plan([step('video.trim', { startSec: 0 })]))).toMatch(/missing endSec/)
  })

  it('accepts either alternative where one is enough', () => {
    expect(checkParams(plan([step('pdf.split', { ranges: '1-2' })]))).toBeNull()
    expect(checkParams(plan([step('pdf.split', { everyN: 2 })]))).toBeNull()
    expect(checkParams(plan([step('pdf.split')]))).toMatch(/one of ranges, everyN/)
  })

  it('passes a step that needs nothing', () => {
    expect(checkParams(plan([step('pdf.repair')]))).toBeNull()
  })
})
