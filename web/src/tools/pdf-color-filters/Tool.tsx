import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { rasterizePdf, type ColourFilter } from '@/ops/pdf/raster'
import { meta } from './meta'

const NOTES: Record<Exclude<ColourFilter, 'none'>, string> = {
  grayscale: 'Cheaper to print, and smaller than colour scans.',
  invert: 'White on black, easier on the eyes at night.',
  contrast: 'Pushes faint pencil or old photocopies towards readable black and white.',
}

export default function ColourFiltersTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [filter, setFilter] = useState<Exclude<ColourFilter, 'none'>>('grayscale')
  const [dpi, setDpi] = useState('150')

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(await rasterizePdf(file, { dpi: Number(dpi), quality: 0.85, filter }, progress))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="APPLY FILTER"
      onRun={run}
      footnote="Pages are re-rendered as images, so text stops being selectable"
      settings={
        <>
          <Field label="Filter">
            <Segmented
              label="Colour filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'grayscale', label: 'Greyscale' },
                { value: 'invert', label: 'Invert' },
                { value: 'contrast', label: 'High contrast' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">{NOTES[filter]}</p>

          <Field label="Resolution" aside="dpi">
            <Segmented
              label="Resolution"
              value={dpi}
              onChange={setDpi}
              options={[
                { value: '96', label: '96' },
                { value: '150', label: '150' },
                { value: '200', label: '200' },
              ]}
            />
          </Field>
        </>
      }
    />
  )
}
