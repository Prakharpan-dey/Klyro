import { useState } from 'react'
import { CropFrame } from '@/components/console/CropFrame'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { cropImages } from '@/ops/image/edit'
import { aspectCrop, clampCrop, type Aspect, type CropBox } from '@/ops/image/geometry'
import { meta } from './meta'

const RATIO: Record<Exclude<Aspect, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
}

const FULL: CropBox = { x: 0, y: 0, w: 1, h: 1 }

export default function ImageCropTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [box, setBox] = useState<CropBox>(FULL)
  const [aspect, setAspect] = useState<Aspect>('free')
  const [portrait, setPortrait] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number }>()

  const file = files.list[0]
  const ratio = aspect === 'free' ? undefined : portrait ? 1 / RATIO[aspect] : RATIO[aspect]

  const reshape = (next: Aspect, upright = portrait) => {
    setAspect(next)
    if (size) setBox(aspectCrop(size, next, upright))
  }

  /** the numeric fields work in percent, which reads better than fractions */
  const field = (key: keyof CropBox, label: string) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`crop-${key}`} className="label">
        {label}
      </Label>
      <Input
        id={`crop-${key}`}
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={Math.round(box[key] * 1000) / 10}
        onChange={(e) => {
          const value = Number(e.target.value)
          if (!Number.isFinite(value)) return
          const next = { ...box, [key]: value / 100 }
          // typing a width keeps a locked shape locked
          if (ratio && size && key === 'w') next.h = (next.w * size.width) / (size.height * ratio)
          if (ratio && size && key === 'h') next.w = (next.h * size.height * ratio) / size.width
          setBox(clampCrop(next))
        }}
      />
    </div>
  )

  const run = () => job.run((progress) => cropImages(files.list, box, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="CROP"
      onRun={run}
      canRun={Boolean(file)}
      footnote={
        files.list.length > 1
          ? 'The same box, as proportions, crops every picture in the batch'
          : 'Keeps the original format'
      }
      workbench={
        file ? <CropFrame file={file} box={box} onChange={setBox} ratio={ratio} onSize={setSize} /> : undefined
      }
      outputLabel={file ? 'D · Output' : undefined}
      settings={
        <>
          <Field label="Shape">
            <Segmented
              label="Crop shape"
              value={aspect}
              onChange={(next) => reshape(next)}
              options={[
                { value: 'free', label: 'Free' },
                { value: '1:1', label: '1:1' },
                { value: '4:3', label: '4:3' },
                { value: '3:2', label: '3:2' },
                { value: '16:9', label: '16:9' },
              ]}
            />
          </Field>

          {aspect !== 'free' && aspect !== '1:1' && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="crop-portrait" className="label">
                Portrait
              </Label>
              <Switch
                id="crop-portrait"
                checked={portrait}
                onCheckedChange={(on) => {
                  setPortrait(on)
                  reshape(aspect, on)
                }}
              />
            </div>
          )}

          <Field label="Exact position" aside="% of the picture">
            <div className="grid grid-cols-4 gap-2">
              {field('x', 'Left')}
              {field('y', 'Top')}
              {field('w', 'Width')}
              {field('h', 'Height')}
            </div>
          </Field>

          <button
            type="button"
            onClick={() => {
              setAspect('free')
              setBox(FULL)
            }}
            className="self-start readout text-[11px] text-dim underline-offset-4 hover:text-foreground hover:underline"
          >
            Reset to the whole picture
          </button>
        </>
      }
    />
  )
}
