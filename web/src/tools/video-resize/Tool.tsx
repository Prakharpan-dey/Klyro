import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Input } from '@/components/ui/input'
import { formatBytes } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import { planResize, resizeVideo } from '@/ops/video/ops'
import { meta } from './meta'

const MIN_HEIGHT = 144
const MAX_HEIGHT = 2160

export default function ResizeVideoTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const [preset, setPreset] = useState('720')
  const [custom, setCustom] = useState('540')

  const height = Number(preset === 'custom' ? custom : preset)
  const valid = Number.isInteger(height) && height >= MIN_HEIGHT && height <= MAX_HEIGHT
  const plan =
    state.probe && file && valid && state.probe.durationSec > 0
      ? planResize(state.probe, height, file.size)
      : undefined
  const same = plan && state.probe && plan.target.height === state.probe.height

  const blocked = state.capability && !state.capability.ok

  const run = () =>
    job.run((progress, signal) => resizeVideo(files.list, { height }, progress, signal))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      workbench={
        <VideoWorkbench file={file} state={state}>
          {plan && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-soft">
              <span className="text-foreground">
                {plan.target.width}×{plan.target.height}
              </span>
              , about <span className="text-foreground">{formatBytes(plan.bytes)}</span> at{' '}
              {Math.round(plan.videoBps / 1000)} kbps.
              {plan.upscale && ' That is bigger than the original, which adds no detail.'}
            </p>
          )}
        </VideoWorkbench>
      }
      runLabel="RESIZE"
      onRun={run}
      canRun={Boolean(file) && valid && !same && !blocked}
      intakeHint="One clip at a time."
      footnote={
        same
          ? 'That is the size it already is'
          : 'The width follows the original shape, so nothing is stretched'
      }
      settings={
        <>
          {blocked && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              {state.capability?.reason}
            </p>
          )}

          <Field label="Height">
            <Segmented
              label="Height"
              value={preset}
              onChange={setPreset}
              options={[
                { value: '1080', label: '1080p' },
                { value: '720', label: '720p' },
                { value: '480', label: '480p' },
                { value: '360', label: '360p' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </Field>

          {preset === 'custom' && (
            <Field label="Custom height in pixels">
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_HEIGHT}
                max={MAX_HEIGHT}
                step={2}
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                aria-invalid={!valid}
              />
              {!valid && (
                <p className="readout text-[10px] text-egress">
                  Between {MIN_HEIGHT} and {MAX_HEIGHT} pixels
                </p>
              )}
            </Field>
          )}

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            The bitrate scales with the picture, so a smaller frame gives a smaller file that looks
            the same. Sound is kept as it is. To aim at a file size instead, use Compress Video.
          </p>
        </>
      }
    />
  )
}
