import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ImageFormat } from '@/lib/imageMath'
import { useFileJob } from '@/lib/useFileJob'
import { rasterizeSvgs, type SvgOutputSize } from '@/ops/image/svg'
import { meta } from './meta'

const MAX_WIDTH = 16_384

export default function SvgToPngTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [format, setFormat] = useState<ImageFormat>('image/png')
  const [preset, setPreset] = useState('2')
  const [width, setWidth] = useState('1024')
  const [white, setWhite] = useState(false)

  const exact = preset === 'width'
  const widthValue = Number(width)
  const widthValid = Number.isInteger(widthValue) && widthValue >= 1 && widthValue <= MAX_WIDTH
  const size: SvgOutputSize = exact
    ? { mode: 'width', width: widthValue }
    : { mode: 'scale', scale: Number(preset) }
  const transparent = format !== 'image/jpeg' && !white

  const run = () =>
    job.run((progress) =>
      rasterizeSvgs(
        files.list,
        { format, size, background: transparent ? undefined : '#ffffff' },
        progress,
      ),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      // a few lines of vector text against a grid of pixels: the PNG is always
      // bigger, and "+400%" would read like something went wrong
      compareSizes={false}
      runLabel="CONVERT"
      onRun={run}
      canRun={!exact || widthValid}
      footnote={
        transparent
          ? 'Transparent parts stay transparent'
          : 'Transparent parts are filled with white'
      }
      settings={
        <>
          <Field label="Convert to">
            <Segmented
              label="Target format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'image/png', label: 'PNG' },
                { value: 'image/jpeg', label: 'JPG' },
                { value: 'image/webp', label: 'WebP' },
              ]}
            />
          </Field>

          <Field label="Size">
            <Segmented
              label="Output size"
              value={preset}
              onChange={setPreset}
              options={[
                { value: '1', label: '1×' },
                { value: '2', label: '2×' },
                { value: '4', label: '4×' },
                { value: 'width', label: 'Width' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {exact
                ? 'The height follows the shape of the drawing'
                : 'Times the size the SVG says it is; 2× suits most screens'}
            </p>
          </Field>

          {exact && (
            <Field label="Width in pixels">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_WIDTH}
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                aria-invalid={!widthValid}
              />
              {!widthValid && (
                <p className="readout text-[10px] text-egress">Between 1 and {MAX_WIDTH} pixels</p>
              )}
            </Field>
          )}

          {format !== 'image/jpeg' && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="svg-white" className="label">
                White background
              </Label>
              <Switch id="svg-white" checked={white} onCheckedChange={setWhite} />
            </div>
          )}

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            A vector is redrawn at the new size, not stretched, so edges stay sharp at any width.
            Fonts the SVG names but does not carry are swapped for ones on this device.
          </p>
        </>
      }
    />
  )
}
