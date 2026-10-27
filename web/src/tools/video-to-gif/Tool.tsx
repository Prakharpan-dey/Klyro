import { useRef, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { formatBytes, formatDuration } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import {
  estimateGifBytes,
  frameTimes,
  gifHeight,
  MAX_GIF_SECONDS,
  videoToGif,
} from '@/ops/video/gif'
import { meta } from './meta'

function stamp(seconds: number): string {
  return `${formatDuration(seconds)}.${Math.floor((seconds % 1) * 10)}`
}

export default function VideoToGifTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const video = useRef<HTMLVideoElement>(null)

  const [width, setWidth] = useState('360')
  const [fps, setFps] = useState('12')
  const [loop, setLoop] = useState(true)

  const duration = state.probe?.durationSec ?? 0
  const [picked, setPicked] = useState<{ for?: File; range: [number, number] }>({ range: [0, 0] })
  // a new clip starts with its first few seconds picked, never more than the cap
  const [start, end] =
    picked.for === file ? picked.range : [0, Math.min(duration, Math.min(5, MAX_GIF_SECONDS))]
  const length = Math.max(0, end - start)
  const valid = duration > 0 && length >= 0.2

  const scrub = (next: [number, number]) => {
    setPicked({ for: file, range: next })
    if (video.current) {
      video.current.currentTime = next[0] !== start ? next[0] : Math.max(0, next[1] - 0.05)
    }
  }

  const source = { width: state.probe?.width ?? 0, height: state.probe?.height ?? 0 }
  const frames = valid ? frameTimes(start, end, Number(fps)).length : 0
  const estimate = estimateGifBytes(Number(width), gifHeight(Number(width), source), frames)

  const run = () =>
    job.run(async (progress, signal) => [
      await videoToGif(
        file,
        { start, end, width: Number(width), fps: Number(fps), loop },
        progress,
        signal,
      ),
    ])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      compareSizes={false}
      workbench={
        <VideoWorkbench file={file} state={state} videoRef={video}>
          {duration > 0 && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-soft">
              <span className="text-foreground">{stamp(length)}</span> from {stamp(start)} to{' '}
              {stamp(end)} · {frames} frames · about{' '}
              <span className="text-foreground">{formatBytes(estimate)}</span>
            </p>
          )}
        </VideoWorkbench>
      }
      runLabel="MAKE GIF"
      onRun={run}
      canRun={valid}
      intakeHint="One clip at a time."
      footnote={`Up to ${MAX_GIF_SECONDS} seconds — GIF has no real compression for video`}
      settings={
        <>
          <Field label="Start" aside={stamp(start)}>
            <Slider
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={[start]}
              onValueChange={([v]) => {
                const nextStart = Math.min(v, end - 0.2)
                // moving the start drags the end along rather than breaking the cap
                scrub([nextStart, Math.min(end, nextStart + MAX_GIF_SECONDS)])
              }}
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
              onValueChange={([v]) =>
                scrub([start, Math.min(Math.max(v, start + 0.2), start + MAX_GIF_SECONDS)])
              }
              disabled={!duration}
              aria-label="End"
            />
          </Field>

          <Field label="Width">
            <Segmented
              label="GIF width"
              value={width}
              onChange={setWidth}
              options={[
                { value: '240', label: '240 px' },
                { value: '360', label: '360 px' },
                { value: '480', label: '480 px' },
              ]}
            />
          </Field>

          <Field label="Smoothness">
            <Segmented
              label="Frames per second"
              value={fps}
              onChange={setFps}
              options={[
                { value: '8', label: '8 fps' },
                { value: '12', label: '12 fps' },
                { value: '15', label: '15 fps' },
              ]}
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="gif-loop" className="label">
              Loop forever
            </Label>
            <Switch id="gif-loop" checked={loop} onCheckedChange={setLoop} />
          </div>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Size grows with every pixel and every frame, so a short clip at 360 px is usually the
            sweet spot. There is no sound in a GIF.
          </p>
        </>
      }
    />
  )
}
