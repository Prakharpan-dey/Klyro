import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatBytes } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import type { QualityTier } from '@/ops/video/bitrate'
import { LARGE_VIDEO_BYTES } from '@/ops/video/engine'
import { compressVideo, planCompression } from '@/ops/video/ops'
import { meta } from './meta'

const presets = [5, 10, 25, 50]

export default function CompressVideoTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)

  const [mode, setMode] = useState<'target' | 'quality'>('target')
  const [targetMB, setTargetMB] = useState('10')
  const [tier, setTier] = useState<QualityTier>('balanced')
  const [height, setHeight] = useState(0)
  const [muted, setMuted] = useState(false)

  const target = Number(targetMB)
  const targetValid = Number.isFinite(target) && target >= 0.2
  const params = { mode, targetMB: target, tier, height, muted, container: 'mp4' as const }
  const plan =
    state.probe && targetValid ? planCompression(state.probe, params, file?.size) : undefined

  const blocked = state.capability && !state.capability.ok
  const undecodable = state.probe && !state.probe.canDecodeVideo

  const run = () =>
    job.run((progress, signal) => compressVideo(files.list, params, progress, signal))

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
              About <span className="text-foreground">{formatBytes(plan.bytes)}</span> at{' '}
              {Math.round(plan.videoBps / 1000)} kbps
              {plan.size ? `, ${plan.size.width}×${plan.size.height}` : ''}.
              {!plan.achievable && ' That target is smaller than this clip can go.'}
              {plan.alreadySmaller &&
                ' This clip is already lighter than that, so it is kept as it is rather than padded.'}
            </p>
          )}
        </VideoWorkbench>
      }
      runLabel="COMPRESS"
      onRun={run}
      canRun={Boolean(file) && targetValid && !blocked && !undecodable}
      intakeHint="One clip at a time. MP4, MOV, WebM and MKV."
      footnote={
        file && file.size > LARGE_VIDEO_BYTES
          ? 'Over 200 MB — this will take a while and a phone may run out of room'
          : 'Encoded by this device, at about the speed it plays'
      }
      settings={
        <>
          {blocked && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              {state.capability?.reason}
            </p>
          )}
          {undecodable && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              This browser cannot decode {state.probe?.videoCodec ?? 'this video'} on this machine.
              Chrome or Edge on a desktop usually can.
            </p>
          )}

          <Field label="Aim for">
            <Segmented
              label="Compression mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'target', label: 'A size' },
                { value: 'quality', label: 'A quality' },
              ]}
            />
          </Field>

          {mode === 'target' ? (
            <Field label="Fit under" htmlFor="vid-target" aside="MB">
              <Input
                id="vid-target"
                type="number"
                inputMode="decimal"
                min={0.2}
                step={0.5}
                value={targetMB}
                onChange={(e) => setTargetMB(e.target.value)}
                aria-invalid={!targetValid}
                className="h-10 text-base"
              />
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTargetMB(String(p))}
                    className="border border-line px-2 py-1 text-[10.5px] tracking-[0.06em] text-soft hover:border-primary hover:text-foreground"
                  >
                    {p} MB
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Quality">
              <Segmented
                label="Quality"
                value={tier}
                onChange={setTier}
                options={[
                  { value: 'small', label: 'Smaller' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'high', label: 'Sharper' },
                ]}
              />
            </Field>
          )}

          <Field label="Picture size">
            <Segmented
              label="Picture size"
              value={String(height)}
              onChange={(value) => setHeight(Number(value))}
              options={[
                { value: '0', label: 'Auto' },
                { value: '1080', label: '1080p' },
                { value: '720', label: '720p' },
                { value: '480', label: '480p' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {height
                ? 'Fixed height; the width follows the original shape'
                : 'Shrinks the frame only when the bitrate is too thin to carry it'}
            </p>
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="vid-mute" className="label">
              Drop the sound
            </Label>
            <Switch id="vid-mute" checked={muted} onCheckedChange={setMuted} />
          </div>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A size limit is met by lowering the bitrate, and by using a smaller frame when the
            bitrate alone would turn the picture to mush. Sound costs about 128 kbps of the budget,
            which is worth dropping for a screen recording.
          </p>
        </>
      }
    />
  )
}
