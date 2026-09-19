import type { Plan, PlanRequest, PlanStep } from './schema'

const OP_WORDS: Partial<Record<PlanStep['op'], string>> = {
  'pdf.merge': 'merge the PDFs',
  'pdf.deletePages': 'delete the listed pages',
  'pdf.rotate': 'rotate the pages',
  'pdf.fromImages': 'put the images into a PDF',
  'image.compress': 'compress the images',
  'image.convert': 'convert the images',
  'pdf.compress': 'shrink the PDFs',
  'pdf.watermark': 'stamp a watermark on',
  'pdf.ocr': 'read the scan with OCR',
  'pdf.strip': 'strip the hidden data',
  'video.compress': 'shrink the videos',
  'video.trim': 'trim the videos',
}

/**
 * Keyword planner used when the model is unavailable (MOCK_PLANNER=1) and for local
 * development without AWS credentials. It understands a handful of phrasings only.
 */
export function planWithMock(req: PlanRequest): Plan {
  const text = req.instruction.toLowerCase()
  const images = req.files.filter((f) => f.kind === 'image').map((f) => `file:${f.index}`)
  const pdfs = req.files.filter((f) => f.kind === 'pdf').map((f) => `file:${f.index}`)
  const videos = req.files.filter((f) => f.kind === 'video').map((f) => `file:${f.index}`)
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

  const trim = text.match(/(?:first|trim(?:\s+to)?)\s+(\d+)\s*(?:s|sec|seconds?)/)
  if (trim && videos.length) {
    steps.push({
      op: 'video.trim',
      inputs: videos,
      params: { startSec: 0, endSec: Number(trim[1]) },
    })
  }

  const mb = text.match(/(\d+)\s*mb/)
  if (videos.length && (mb || /compress|shrink|smaller/.test(text))) {
    steps.push({
      op: 'video.compress',
      inputs: steps.length ? [`step:${steps.length}`] : videos,
      params: mb ? { targetMB: Number(mb[1]) } : { tier: 'balanced' },
    })
  }

  const watermark = text.match(/watermark(?:\s+(?:with|saying))?\s+"?([\w\s]{1,40})"?/)
  if (watermark && pdfs.length) {
    steps.push({
      op: 'pdf.watermark',
      inputs: last() ?? pdfs,
      params: { text: watermark[1].trim().toUpperCase() },
    })
  }

  if (/ocr|searchable|scanned?/.test(text) && (pdfs.length || images.length)) {
    steps.push({ op: 'pdf.ocr', inputs: last() ?? [...pdfs, ...images], params: { language: 'eng' } })
  }

  if (/(strip|remove|clean).{0,20}(metadata|hidden|private)/.test(text) && pdfs.length) {
    steps.push({ op: 'pdf.strip', inputs: last() ?? pdfs, params: {} })
  }

  if (/to pdf|into (a|one) pdf/.test(text) && images.length) {
    steps.push({ op: 'pdf.fromImages', inputs: images, params: { pageSize: 'a4' } })
  }

  const kb = text.match(/(\d+)\s*kb/)
  if (kb && images.length && !steps.length) {
    steps.push({ op: 'image.compress', inputs: images, params: { targetKB: Number(kb[1]) } })
  }

  // a PDF size target is the request that used to be refused outright
  if (pdfs.length && (kb || /compress|shrink|smaller/.test(text))) {
    steps.push({
      op: 'pdf.compress',
      inputs: last() ?? pdfs,
      params: kb ? { targetKB: Number(kb[1]) } : { dpi: 120 },
    })
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
        'I could not match that request. Try wording like "merge and remove page 2", "compress to 200 KB", "watermark with DRAFT" or "convert to webp".',
      steps,
    }
  }

  const words = steps.map((s) => OP_WORDS[s.op] ?? s.op)
  const summary = `${words.join(', then ')}.`
  return { summary: summary.charAt(0).toUpperCase() + summary.slice(1), clarification: null, steps }
}
