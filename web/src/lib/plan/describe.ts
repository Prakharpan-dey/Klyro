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
  }
}
