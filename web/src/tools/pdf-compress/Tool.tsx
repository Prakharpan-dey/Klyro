import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { rasterizePdf } from '@/ops/pdf/raster'
import { meta } from './meta'

type Mode = 'target' | 'quality'

const PRESETS = [
  { value: '96', label: 'Small' },
  { value: '150', label: 'Balanced' },
  { value: '200', label: 'Sharp' },
]

export default function CompressPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [mode, setMode] = useState<Mode>('target')
  const [targetKB, setTargetKB] = useState('500')
  const [quality, setQuality] = useState(70)
  const [dpi, setDpi] = useState('150')

  const target = Number(targetKB)
  const targetValid = Number.isFinite(target) && target >= 20

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(
          await rasterizePdf(
            file,
            {
              dpi: Number(dpi),
              quality: quality / 100,
              targetKB: mode === 'target' ? target : undefined,
            },
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
      runLabel="COMPRESS"
      onRun={run}
      canRun={mode === 'quality' || targetValid}
      footnote="Pages become images, so text stops being selectable and searchable"
      settings={
        <>
          <Field label="Mode">
            <Segmented
              label="Compression mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'target', label: 'Target size' },
                { value: 'quality', label: 'Quality' },
              ]}
            />
          </Field>

          {mode === 'target' ? (
            <Field label="Aim for" htmlFor="cp-target" aside="KB">
              <Input
                id="cp-target"
                type="number"
                min={20}
                value={targetKB}
                onChange={(e) => setTargetKB(e.target.value)}
                aria-invalid={!targetValid}
                className="h-10 text-base"
              />
              <div className="flex flex-wrap gap-1.5">
                {[200, 500, 1000, 2000].map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKB(String(kb))}
                    className="border border-line px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft hover:border-primary hover:text-foreground"
                  >
                    {kb} KB
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Quality" aside={`${quality}%`}>
              <Slider
                min={20}
                max={95}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          )}

          <Field label="Resolution" aside="dpi">
            <Segmented label="Resolution" value={dpi} onChange={setDpi} options={PRESETS} />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Best for scans and photo-heavy files. A PDF that is mostly text may not shrink much, and
            keeping it untouched is usually better.
          </p>
        </>
      }
    />
  )
}
