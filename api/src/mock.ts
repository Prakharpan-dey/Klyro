import type { Plan, PlanRequest, PlanStep } from './schema'

/**
 * Keyword planner for local development without AWS credentials (MOCK_PLANNER=1).
 * It only understands a handful of phrasings; the real planner runs on Bedrock.
 */
export function planWithMock(req: PlanRequest): Plan {
  const text = req.instruction.toLowerCase()
  const images = req.files.filter((f) => f.kind === 'image').map((f) => `file:${f.index}`)
  const pdfs = req.files.filter((f) => f.kind === 'pdf').map((f) => `file:${f.index}`)
  const steps: PlanStep[] = []
  const last = () => (steps.length ? [`step:${steps.length}`] : null)

  if (!req.files.length) {
    return { summary: 'Nothing to do yet.', clarification: 'Add some files first.', steps }
  }

  if (/merge|combine|join/.test(text) && pdfs.length > 1) {
    steps.push({ op: 'pdf.merge', inputs: pdfs, params: {} })
  }

  const drop = text.match(/(?:remove|delete|drop)\s+pages?\s+([\d,\s-]+)/)
  if (drop && pdfs.length) {
    steps.push({ op: 'pdf.deletePages', inputs: last() ?? pdfs, params: { pages: drop[1].trim() } })
  }

  const rotate = text.match(/rotate[^\d]*(90|180|270)?/)
  if (rotate && pdfs.length) {
    const degrees = Number(rotate[1] ?? 90) as 90 | 180 | 270
    steps.push({ op: 'pdf.rotate', inputs: last() ?? pdfs, params: { degrees } })
  }

  if (/to pdf|into (a|one) pdf/.test(text) && images.length) {
    steps.push({ op: 'pdf.fromImages', inputs: images, params: { pageSize: 'a4' } })
  }

  const kb = text.match(/(\d+)\s*kb/)
  if (kb && images.length && !steps.length) {
    steps.push({ op: 'image.compress', inputs: images, params: { targetKB: Number(kb[1]) } })
  }

  const format = text.match(/\b(webp|png|jpe?g)\b/)
  if (format && images.length && !steps.length) {
    const f = format[1].startsWith('jp') ? 'jpeg' : (format[1] as 'png' | 'webp')
    steps.push({ op: 'image.convert', inputs: images, params: { format: f } })
  }

  if (!steps.length) {
    return {
      summary: 'Could not match that request.',
      clarification:
        'The local mock planner only understands simple requests like "merge and remove page 2" or "compress to 200 KB".',
      steps,
    }
  }

  return { summary: `Mock plan with ${steps.length} step(s).`, clarification: null, steps }
}
