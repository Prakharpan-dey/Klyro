import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useImageFormats } from '@/components/tool/useImageFormats'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { ImageFormat, ResizeSpec } from '@/lib/imageMath'
import { cmToPx } from '@/lib/imageMath'
import { useFileJob } from '@/lib/useFileJob'
import { resizeImages } from '@/ops/image/resize'
import { meta } from './meta'

type Unit = 'px' | 'percent' | 'cm'

const dpis = ['72', '96', '150', '200', '300'] as const

function num(v: string): number | undefined {
  const n = Number(v)
  return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined
}

export default function ResizeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [unit, setUnit] = useState<Unit>('px')
  const [width, setWidth] = useState('1280')
  const [height, setHeight] = useState('')
  const [percent, setPercent] = useState(50)
  const [dpi, setDpi] = useState<(typeof dpis)[number]>('300')
  const [keepAspect, setKeepAspect] = useState(true)
  const [format, setFormat] = useState<ImageFormat | 'keep'>('keep')
  const formats = useImageFormats(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

  const w = num(width)
  const h = num(height)

  const spec: ResizeSpec =
    unit === 'percent'
      ? { mode: 'percent', percent }
      : unit === 'cm'
        ? { mode: 'cm', width: w, height: h, dpi: Number(dpi), keepAspect }
        : { mode: 'px', width: w, height: h, keepAspect }

  const canRun = unit === 'percent' || Boolean(w || h)

  const run = () =>
    job.run((progress) => resizeImages(files.list, { resize: spec, format }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="RESIZE"
      onRun={run}
      canRun={canRun}
      footnote="EXIF and GPS data are removed from the output"
      settings={
        <>
          <Field label="Unit">
            <Segmented
              label="Unit"
              value={unit}
              onChange={(u) => {
                setUnit(u)
                if (u === 'cm') {
                  setWidth('3.5')
                  setHeight('4.5')
                } else if (u === 'px') {
                  setWidth('1280')
                  setHeight('')
                }
              }}
              options={[
                { value: 'px', label: 'px' },
                { value: 'percent', label: '%' },
                { value: 'cm', label: 'cm' },
              ]}
            />
          </Field>

          {unit === 'percent' ? (
            <Field label="Scale" aside={`${percent}%`}>
              <Slider
                min={5}
                max={200}
                step={5}
                value={[percent]}
                onValueChange={([v]) => setPercent(v)}
                aria-label="Scale percent"
              />
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width" htmlFor="rs-w" aside={unit}>
                  <Input
                    id="rs-w"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="auto"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="h-10 text-base"
                  />
                </Field>
                <Field label="Height" htmlFor="rs-h" aside={unit}>
                  <Input
                    id="rs-h"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="auto"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-10 text-base"
                  />
                </Field>
              </div>

              {unit === 'cm' && (
                <Field
                  label="DPI"
                  aside={
                    w || h
                      ? `${w ? cmToPx(w, Number(dpi)) : 'auto'} × ${h ? cmToPx(h, Number(dpi)) : 'auto'} px`
                      : undefined
                  }
                >
                  <Segmented
                    label="DPI"
                    value={dpi}
                    onChange={setDpi}
                    options={dpis.map((d) => ({ value: d, label: d }))}
                  />
                </Field>
              )}

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="rs-aspect" className="label">
                  Keep aspect ratio
                </Label>
                <Switch id="rs-aspect" checked={keepAspect} onCheckedChange={setKeepAspect} />
              </div>
              <p className="-mt-3 font-sans text-[11.5px] text-faint">
                {keepAspect
                  ? 'With both sides set, the image fits inside that box.'
                  : 'With both sides set, the image is stretched to exactly that size.'}
              </p>
            </>
          )}

          <Field label="Output format">
            <Segmented
              label="Output format"
              value={format}
              onChange={setFormat}
              options={[{ value: 'keep', label: 'Same' }, ...formats.options]}
            />
          </Field>
        </>
      }
    />
  )
}
