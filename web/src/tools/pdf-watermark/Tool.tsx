import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { stampText } from '@/ops/pdf/stamp'
import { meta } from './meta'

const PRESETS = ['DRAFT', 'COPY', 'CONFIDENTIAL', 'DO NOT COPY']

const GREY = { r: 0.55, g: 0.55, b: 0.55 }
const RED = { r: 0.75, g: 0.15, b: 0.15 }
const BLUE = { r: 0.15, g: 0.35, b: 0.75 }

export default function WatermarkTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [text, setText] = useState('DRAFT')
  const [opacity, setOpacity] = useState(18)
  const [size, setSize] = useState(60)
  const [angle, setAngle] = useState(45)
  const [tile, setTile] = useState(false)
  const [colour, setColour] = useState<'grey' | 'red' | 'blue'>('grey')

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(
          await stampText(file, {
            textFor: () => text.trim(),
            anchor: 'center',
            family: 'helvetica',
            bold: true,
            size: tile ? Math.max(12, Math.round(size / 3)) : size,
            marginMm: 0,
            opacity: opacity / 100,
            rotate: angle,
            color: colour === 'red' ? RED : colour === 'blue' ? BLUE : GREY,
            tile,
            suffix: '-watermarked',
          }),
        )
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
      runLabel="ADD WATERMARK"
      onRun={run}
      canRun={Boolean(text.trim())}
      footnote="The watermark sits on top of the page; the text underneath stays selectable"
      settings={
        <>
          <Field label="Text" htmlFor="wm-text">
            <Input
              id="wm-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={40}
              className="h-10 text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setText(p)}
                  className="border border-line px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft hover:border-primary hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Opacity" aside={`${opacity}%`}>
            <Slider
              min={5}
              max={60}
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              aria-label="Opacity"
            />
          </Field>

          <Field label="Size" aside={`${size} pt`}>
            <Slider
              min={20}
              max={120}
              value={[size]}
              onValueChange={([v]) => setSize(v)}
              aria-label="Size"
            />
          </Field>

          <Field label="Angle" aside={`${angle}°`}>
            <Slider
              min={0}
              max={90}
              step={5}
              value={[angle]}
              onValueChange={([v]) => setAngle(v)}
              aria-label="Angle"
            />
          </Field>

          <Field label="Colour">
            <Segmented
              label="Colour"
              value={colour}
              onChange={setColour}
              options={[
                { value: 'grey', label: 'Grey' },
                { value: 'red', label: 'Red' },
                { value: 'blue', label: 'Blue' },
              ]}
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="wm-tile" className="label">
              Repeat across the page
            </Label>
            <Switch id="wm-tile" checked={tile} onCheckedChange={setTile} />
          </div>
        </>
      }
    />
  )
}
