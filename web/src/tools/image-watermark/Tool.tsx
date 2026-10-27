import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { watermarkImages } from '@/ops/image/edit'
import type { WatermarkAnchor } from '@/ops/image/geometry'
import type { Anchor } from '@/ops/pdf/stamp'
import { meta } from './meta'

export default function ImageWatermarkTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [text, setText] = useState('')
  const [anchor, setAnchor] = useState<Anchor>('bottom-right')
  const [tile, setTile] = useState(false)
  const [opacity, setOpacity] = useState(55)
  const [size, setSize] = useState(6)
  const [colour, setColour] = useState<'light' | 'dark'>('light')

  const run = () =>
    job.run((progress) =>
      watermarkImages(
        files.list,
        {
          text,
          anchor: anchor as WatermarkAnchor,
          tile,
          opacity: opacity / 100,
          size: size / 100,
          colour,
        },
        progress,
      ),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="STAMP"
      onRun={run}
      canRun={text.trim().length > 0}
      footnote="Drawn into the pixels — it cannot be switched off"
      settings={
        <>
          <Field label="Text">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For rental application only"
              aria-label="Watermark text"
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="wm-tile" className="label">
              Repeat across the picture
            </Label>
            <Switch id="wm-tile" checked={tile} onCheckedChange={setTile} />
          </div>

          {!tile && (
            <Field label="Position">
              <AnchorPicker value={anchor} onChange={setAnchor} />
            </Field>
          )}

          <Field label="Colour">
            <Segmented
              label="Watermark colour"
              value={colour}
              onChange={setColour}
              options={[
                { value: 'light', label: 'White' },
                { value: 'dark', label: 'Black' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size" aside={`${size}%`}>
              <Slider
                min={2}
                max={20}
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                aria-label="Text size, as a share of the picture"
              />
            </Field>
            <Field label="Strength" aside={`${opacity}%`}>
              <Slider
                min={10}
                max={100}
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                aria-label="Opacity"
              />
            </Field>
          </div>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Size is measured against each picture&apos;s shorter side, so a batch of different sizes
            gets marks that look the same on all of them.
          </p>
        </>
      }
    />
  )
}
