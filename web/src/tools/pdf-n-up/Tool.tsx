import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { gridFor, pagesPerSheet, type NUpParams, type Orientation } from '@/ops/pdf/geometry'
import { meta } from './meta'

export default function NUpTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [perSheet, setPerSheet] = useState<NUpParams['perSheet']>(4)
  const [size, setSize] = useState<'a4' | 'letter'>('a4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [marginMm, setMarginMm] = useState(8)
  const [gapMm, setGapMm] = useState(4)

  const { cols, rows } = gridFor(perSheet)
  const pages = files.files.reduce((n, f) => n + (f.meta?.pages ?? 0), 0)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await pagesPerSheet(file, { perSheet, size, orientation, marginMm, gapMm }))
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
      runLabel="COMBINE PAGES"
      onRun={run}
      footnote={
        pages
          ? `${pages} pages · ${cols} × ${rows} per sheet · ${Math.ceil(pages / perSheet)} sheets`
          : `${cols} × ${rows} grid`
      }
      settings={
        <>
          <Field label="Pages per sheet">
            <Segmented
              label="Pages per sheet"
              value={String(perSheet)}
              onChange={(v) => setPerSheet(Number(v) as NUpParams['perSheet'])}
              options={[
                { value: '2', label: '2' },
                { value: '4', label: '4' },
                { value: '6', label: '6' },
                { value: '9', label: '9' },
              ]}
            />
          </Field>

          <Field label="Sheet size">
            <Segmented
              label="Sheet size"
              value={size}
              onChange={setSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </Field>

          <Field label="Sheet orientation">
            <Segmented
              label="Sheet orientation"
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Margin" aside={`${marginMm} mm`}>
              <Slider
                min={0}
                max={25}
                value={[marginMm]}
                onValueChange={([v]) => setMarginMm(v)}
                aria-label="Margin"
              />
            </Field>
            <Field label="Gap" aside={`${gapMm} mm`}>
              <Slider
                min={0}
                max={20}
                value={[gapMm]}
                onValueChange={([v]) => setGapMm(v)}
                aria-label="Gap between pages"
              />
            </Field>
          </div>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Saves paper when printing notes. Pages read left to right, top to bottom.
          </p>
        </>
      }
    />
  )
}
