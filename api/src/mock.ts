import type { Plan, PlanRequest, PlanStep } from './schema'

const OP_WORDS: Partial<Record<PlanStep['op'], string>> = {
  'pdf.merge': 'merge the PDFs',
  'pdf.deletePages': 'delete the listed pages',
  'pdf.rotate': 'rotate the pages',
  'pdf.fromImages': 'put the images into a PDF',
  'image.compress': 'compress the images',
  'image.convert': 'convert the images',
}

/**
 * Keyword planner used when the model is unavailable (MOCK_PLANNER=1) and for local
 * development without AWS credentials. It understands a handful of phrasings only.
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
      summary: '',
      clarification:
        'I could not match that request. Try wording like "merge and remove page 2", "compress to 200 KB" or "convert to webp".',
      steps,
    }
  }

  const words = steps.map((s) => OP_WORDS[s.op] ?? s.op)
  const summary = `${words.join(', then ')}.`
  return { summary: summary.charAt(0).toUpperCase() + summary.slice(1), clarification: null, steps }
}
