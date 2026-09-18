import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { resizePages, type Orientation } from '@/ops/pdf/geometry'
import { meta } from './meta'

export default function FixSizeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [size, setSize] = useState<'a4' | 'letter'>('a4')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [marginMm, setMarginMm] = useState(0)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await resizePages(file, { size, orientation, marginMm }))
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
      runLabel="FIX SIZE"
      onRun={run}
      footnote="Pages are scaled to fit and centred, never stretched"
      settings={
        <>
          <Field label="Paper size">
            <Segmented
              label="Paper size"
              value={size}
              onChange={setSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </Field>

          <Field label="Orientation">
            <Segmented
              label="Orientation"
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: 'auto', label: 'Keep' },
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ]}
            />
          </Field>

          <Field label="Margin" aside={`${marginMm} mm`}>
            <Slider
              min={0}
              max={30}
              value={[marginMm]}
              onValueChange={([v]) => setMarginMm(v)}
              aria-label="Margin"
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Useful when a document mixes A4 and Letter pages, or when a printer refuses an unusual
            page size. "Keep" follows each page's own orientation.
          </p>
        </>
      }
    />
  )
}
