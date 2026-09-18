import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { rasterizePdf } from '@/ops/pdf/raster'
import { meta } from './meta'

const DPIS = [
  { value: '96', label: '96' },
  { value: '150', label: '150' },
  { value: '200', label: '200' },
  { value: '300', label: '300' },
]

export default function RasterizeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [dpi, setDpi] = useState('150')
  const [quality, setQuality] = useState(85)
  const [lossless, setLossless] = useState(false)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(
          await rasterizePdf(
            file,
            { dpi: Number(dpi), quality: quality / 100, lossless },
            progress,
          ),
        )
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="RASTERIZE"
      onRun={run}
      footnote="Everything becomes a picture: no selectable text, no forms, no annotations"
      settings={
        <>
          <Field label="Resolution" aside="dpi">
            <Segmented label="Resolution" value={dpi} onChange={setDpi} options={DPIS} />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="rz-lossless" className="label">
              Lossless (PNG)
            </Label>
            <Switch id="rz-lossless" checked={lossless} onCheckedChange={setLossless} />
          </div>

          {!lossless && (
            <Field label="Quality" aside={`${quality}%`}>
              <Slider
                min={30}
                max={100}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          )}

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Flattening is useful when a document must look identical everywhere, or when you want
            copyable text and hidden layers gone for good.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            PNG keeps every pixel exactly but makes far larger files.
          </p>
        </>
      }
    />
  )
}
