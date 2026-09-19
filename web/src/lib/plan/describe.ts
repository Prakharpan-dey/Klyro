import type { PlanStep } from './schema'

function inputsLabel(inputs: string[], fileNames: string[]): string {
  const files = inputs.filter((r) => r.startsWith('file:'))
  const steps = inputs.filter((r) => r.startsWith('step:')).map((r) => `step ${r.slice(5)}`)
  const parts: string[] = []
  if (files.length === 1) parts.push(fileNames[Number(files[0].slice(5))] ?? 'a file')
  else if (files.length > 1) parts.push(`${files.length} files`)
  if (steps.length) parts.push(`the result of ${steps.join(' and ')}`)
  return parts.join(' and ')
}

/** Plain-language line for a plan step, e.g. "Merge 2 files". */
export function describeStep(step: PlanStep, fileNames: string[]): string {
  const p = step.params
  const on = inputsLabel(step.inputs, fileNames)

  switch (step.op) {
    case 'image.compress':
      return p.targetKB
        ? `Compress ${on} to ≤ ${p.targetKB} KB${p.format === 'webp' ? ' as WebP' : ''}`
        : `Compress ${on} at quality ${p.quality ?? 75}`
    case 'image.resize': {
      const unit = p.unit ?? (p.percent ? 'percent' : 'px')
      if (unit === 'percent') return `Resize ${on} to ${p.percent ?? 50}%`
      const size = [p.width ?? 'auto', p.height ?? 'auto'].join(' × ')
      return `Resize ${on} to ${size} ${unit}${unit === 'cm' ? ` at ${p.dpi ?? 300} dpi` : ''}`
    }
    case 'image.convert':
      return `Convert ${on} to ${(p.format ?? 'jpeg').toUpperCase()}`
    case 'pdf.merge':
      return `Merge ${on} into one PDF`
    case 'pdf.split':
      return p.ranges
        ? `Split ${on} into ${p.ranges}`
        : `Split ${on} every ${p.everyN ?? 1} page(s)`
    case 'pdf.extract':
      return `Keep pages ${p.pages} of ${on}`
    case 'pdf.deletePages':
      return `Delete page${p.pages?.match(/[,-]/) ? 's' : ''} ${p.pages} from ${on}`
    case 'pdf.rotate':
      return `Rotate ${p.pages ? `pages ${p.pages} of ` : ''}${on} by ${p.degrees ?? 90}°`
    case 'pdf.reorder':
      return `Reorder ${on} as ${p.order}`
    case 'pdf.fromImages':
      return `Put ${on} into a ${(p.pageSize ?? 'a4').toUpperCase()} PDF`
    case 'pdf.toImages':
      return `Export pages of ${on} as ${(p.format ?? 'jpeg').toUpperCase()}`
    case 'image.stripExif':
      return `Remove camera and location data from ${on}`
    case 'pdf.reverse':
      return `Reverse the page order of ${on}`
    case 'pdf.insertBlank':
      return `Insert ${p.count ?? 1} blank page(s) ${p.where ?? 'after'} ${p.positions} of ${on}`
    case 'pdf.removeBlank':
      return `Drop blank pages from ${on}`
    case 'pdf.alternateMix':
      return `Interleave ${on}${p.reverseSecond ? ', second file backwards' : ''}`
    case 'pdf.crop':
      return `Crop ${p.cropMm} mm off ${on}`
    case 'pdf.nUp':
      return `Put ${p.perSheet ?? 2} pages of ${on} on each sheet`
    case 'pdf.booklet':
      return `Impose ${on} as a folded booklet`
    case 'pdf.divide':
      return `Split each page of ${on} ${p.divideMode ?? 'vertical'}ly`
    case 'pdf.fixSize':
      return `Redraw ${on} on ${(p.pageSize ?? 'a4').toUpperCase()} pages`
    case 'pdf.overlay':
      return `Lay the second PDF over ${on}`
    case 'pdf.watermark':
      return `Watermark ${on} with "${p.text}"`
    case 'pdf.pageNumbers':
      return `Number the pages of ${on}${p.start && p.start !== 1 ? ` from ${p.start}` : ''}`
    case 'pdf.headerFooter':
      return `Stamp "${p.template}" onto ${on}`
    case 'pdf.bates':
      return `Bates-number ${on} from ${p.prefix ?? ''}${String(p.start ?? 1).padStart(p.digits ?? 6, '0')}`
    case 'pdf.fromText':
      return `Make a PDF from the text you gave`
    case 'pdf.toText':
      return `Extract the text of ${on}${p.shape === 'per-page' ? ', one file per page' : ''}`
    case 'pdf.toDocx':
      return `Convert ${on} to Word`
    case 'pdf.toExcel':
      return `Convert ${on} to Excel`
    case 'pdf.fromExcel':
      return `Convert ${on} to PDF`
    case 'pdf.ocr':
      return `Read ${on} with OCR${p.output === 'text' ? ' into a text file' : ''}`
    case 'pdf.compress':
      return p.targetKB
        ? `Compress ${on} to ≤ ${p.targetKB} KB`
        : `Compress ${on} at ${p.dpi ?? 120} dpi`
    case 'pdf.rasterize':
      return `Flatten ${on} to images at ${p.dpi ?? 150} dpi`
    case 'pdf.repair':
      return `Repair ${on}`
    case 'pdf.linearize':
      return `Restructure ${on} for fast web viewing`
    case 'pdf.flatten':
      return `Make form fields and annotations in ${on} permanent`
    case 'pdf.strip':
      return `Strip metadata, scripts and hidden data from ${on}`
    case 'pdf.removeAnnotations':
      return `Remove comments and highlights from ${on}`
    case 'pdf.setMetadata':
      return p.title || p.author || p.subject || p.keywords
        ? `Set the document details of ${on}`
        : `Clear the document details of ${on}`
    case 'video.compress':
      return p.targetMB
        ? `Compress ${on} to ≤ ${p.targetMB} MB`
        : `Compress ${on} at ${p.tier ?? 'balanced'} quality`
    case 'video.convert':
      return `Convert ${on} to ${(p.container ?? 'mp4').toUpperCase()}`
    case 'video.trim':
      return `Trim ${on} to ${p.startSec}s-${p.endSec}s`
    case 'video.extractAudio':
      return `Save the audio of ${on}`
  }
}
