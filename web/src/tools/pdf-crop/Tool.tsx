import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { cropPages } from '@/ops/pdf/geometry'
import { meta } from './meta'

const EDGES = ['top', 'right', 'bottom', 'left'] as const
type Edge = (typeof EDGES)[number]

export default function CropTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [margins, setMargins] = useState<Record<Edge, string>>({
    top: '10',
    right: '10',
    bottom: '10',
    left: '10',
  })

  const values = Object.fromEntries(EDGES.map((edge) => [edge, Number(margins[edge])])) as Record<
    Edge,
    number
  >
  const valid = EDGES.every((edge) => Number.isFinite(values[edge]) && values[edge] >= 0)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await cropPages(file, values))
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="CROP"
      onRun={run}
      canRun={valid}
      footnote="Cropping hides the margins; the content itself stays in the file"
      settings={
        <>
          <Field label="Cut away" aside="mm">
            <div className="grid grid-cols-2 gap-3">
              {EDGES.map((edge) => (
                <div key={edge} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`crop-${edge}`}
                    className="readout text-[10px] text-dim capitalize"
                  >
                    {edge}
                  </label>
                  <Input
                    id={`crop-${edge}`}
                    type="number"
                    min={0}
                    step="any"
                    value={margins[edge]}
                    onChange={(e) => setMargins((m) => ({ ...m, [edge]: e.target.value }))}
                    aria-invalid={!Number.isFinite(values[edge]) || values[edge] < 0}
                    className="h-10 text-base"
                  />
                </div>
              ))}
            </div>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Handy for scans with wide borders, or for removing a printed header before combining
            documents.
          </p>
        </>
      }
    />
  )
}
