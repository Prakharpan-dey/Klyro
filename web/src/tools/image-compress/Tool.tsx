import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useImageFormats } from '@/components/tool/useImageFormats'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import type { ImageFormat } from '@/lib/imageMath'
import { compressImages } from '@/ops/image/compress'
import { meta } from './meta'

type Mode = 'quality' | 'target'

const presets = [20, 50, 100, 200, 500]
const candidates: ImageFormat[] = ['image/jpeg', 'image/webp', 'image/avif', 'image/png']

export default function CompressTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [mode, setMode] = useState<Mode>('target')
  const [format, setFormat] = useState<ImageFormat>('image/jpeg')
  const [quality, setQuality] = useState(75)
  const [targetKB, setTargetKB] = useState('200')

  const target = Number(targetKB)
  const targetValid = Number.isFinite(target) && target >= 5
  const formats = useImageFormats(candidates)
  const lossless = format === 'image/png'

  const run = () =>
    job.run((progress) =>
      compressImages(
        files.list,
        {
          format,
          quality: quality / 100,
          targetKB: mode === 'target' ? target : undefined,
        },
        progress,
      ),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="COMPRESS"
      onRun={run}
      canRun={mode === 'quality' || targetValid}
      footnote="EXIF and GPS data are removed from the output"
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

          {mode === 'target' || lossless ? (
            <Field label="Max size per file" htmlFor="target-kb" aside="KB">
              <Input
                id="target-kb"
                type="number"
                inputMode="numeric"
                min={5}
                value={targetKB}
                onChange={(e) => setTargetKB(e.target.value)}
                aria-invalid={!targetValid}
                className="h-10 text-base"
              />
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTargetKB(String(p))}
                    className="border border-line px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft hover:border-primary hover:text-foreground"
                  >
                    {p} KB
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Quality" aside={quality}>
              <Slider
                min={10}
                max={95}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          )}

          <Field label="Output format">
            <Segmented
              label="Output format"
              value={format}
              onChange={setFormat}
              options={formats.options}
            />
            {lossless && (
              <p className="readout text-[10px] text-faint">
                PNG has no quality dial. A size target is met by reducing the dimensions instead.
              </p>
            )}
            {formats.missing.length > 0 && (
              <p className="readout text-[10px] text-faint">
                {formats.missing.join(', ')} not available in this browser
              </p>
            )}
          </Field>
        </>
      }
    />
  )
}
