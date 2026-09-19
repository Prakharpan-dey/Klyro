import { useRef, useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Slider } from '@/components/ui/slider'
import { formatDuration } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import { trimVideo } from '@/ops/video/ops'
import { meta } from './meta'

/** A trim needs tenths: "0:03" and "0:03.9" are different cuts. */
function stamp(seconds: number): string {
  return `${formatDuration(seconds)}.${Math.floor((seconds % 1) * 10)}`
}

export default function TrimVideoTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const video = useRef<HTMLVideoElement>(null)

  const duration = state.probe?.durationSec ?? 0
  const [picked, setPicked] = useState<{ for?: File; range: [number, number] }>({ range: [0, 0] })

  // the handles belong to the staged clip; a new one starts whole again
  const [start, end] = picked.for === file ? picked.range : [0, duration]
  const length = Math.max(0, end - start)
  const valid = duration > 0 && length >= 0.2

  const scrub = (next: [number, number]) => {
    setPicked({ for: file, range: next })
    if (video.current) {
      // jump to whichever handle moved, so the preview shows the cut
      video.current.currentTime = next[0] !== start ? next[0] : Math.max(0, next[1] - 0.05)
    }
  }

  const run = () =>
    job.run((progress, signal) => trimVideo(files.list, { start, end }, progress, signal))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      workbench={
        <VideoWorkbench file={file} state={state} videoRef={video}>
          {duration > 0 && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-soft">
              Keeping <span className="text-foreground">{stamp(length)}</span> of {stamp(duration)},
              from {stamp(start)} to {stamp(end)}.
            </p>
          )}
        </VideoWorkbench>
      }
      runLabel="TRIM"
      onRun={run}
      canRun={valid}
      intakeHint="One clip at a time."
      footnote="Cuts land on the nearest frame; the rest is copied without re-encoding where it can be"
      settings={
        <>
          <Field label="Start" aside={stamp(start)}>
            <Slider
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={[start]}
              onValueChange={([v]) => scrub([Math.min(v, end - 0.2), end])}
              disabled={!duration}
              aria-label="Start"
            />
          </Field>

          <Field label="End" aside={stamp(end)}>
            <Slider
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={[end]}
              onValueChange={([v]) => scrub([start, Math.max(v, start + 0.2)])}
              disabled={!duration}
              aria-label="End"
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Drag either handle and the preview jumps to that moment, so you can see the cut before
            you make it. The clip is written fresh; the file you dropped is untouched.
          </p>
        </>
      }
    />
  )
}
