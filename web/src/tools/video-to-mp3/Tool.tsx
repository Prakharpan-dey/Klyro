import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Slider } from '@/components/ui/slider'
import { formatDuration } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import { toMp3, type Mp3Bitrate } from '@/ops/video/ops'
import { meta } from './meta'

/** A cut needs tenths: "0:03" and "0:03.9" are different places. */
function stamp(seconds: number): string {
  return `${formatDuration(seconds)}.${Math.floor((seconds % 1) * 10)}`
}

export default function VideoToMp3Tool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const [kbps, setKbps] = useState<Mp3Bitrate>(192)

  const duration = state.probe?.durationSec ?? 0
  const [picked, setPicked] = useState<{ for?: File; range: [number, number] }>({ range: [0, 0] })
  // the handles belong to the staged file; a new one starts whole again
  const [start, end] = picked.for === file ? picked.range : [0, duration]
  const trimmed = duration > 0 && (start > 0 || end < duration)
  const length = Math.max(0, end - start)

  const silent = state.probe && !state.probe.hasAudio
  const valid = duration > 0 && length >= 0.2 && !silent

  const run = () =>
    job.run((progress, signal) =>
      toMp3(files.list, { kbps, trim: trimmed ? { start, end } : undefined }, progress, signal),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      compareSizes={false}
      workbench={
        <VideoWorkbench
          file={file}
          state={state}
          emptyHint="Drop a video or a sound file to hear it here. It plays from this tab; nothing is uploaded."
        >
          {duration > 0 && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-soft">
              {silent ? (
                <span className="text-egress">This file has no sound to save.</span>
              ) : (
                <>
                  Saving <span className="text-foreground">{stamp(length)}</span>
                  {trimmed ? `, from ${stamp(start)} to ${stamp(end)}` : ', the whole thing'}.
                </>
              )}
            </p>
          )}
        </VideoWorkbench>
      }
      runLabel="CONVERT"
      onRun={run}
      canRun={valid}
      intakeHint="One file at a time: a video, or audio such as WAV, M4A, OGG or FLAC."
      footnote="The MP3 encoder loads the first time, from this site"
      settings={
        <>
          <Field label="Quality">
            <Segmented
              label="Bitrate"
              value={String(kbps)}
              onChange={(value) => setKbps(Number(value) as Mp3Bitrate)}
              options={[
                { value: '128', label: '128 kbps' },
                { value: '192', label: '192 kbps' },
                { value: '320', label: '320 kbps' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {kbps === 128
                ? 'Fine for speech, lectures and voice notes'
                : kbps === 192
                  ? 'Music that sounds right on most speakers'
                  : 'The most MP3 can carry; larger files'}
            </p>
          </Field>

          <Field label="Start" aside={stamp(start)}>
            <Slider
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={[start]}
              onValueChange={([v]) =>
                setPicked({ for: file, range: [Math.min(v, end - 0.2), end] })
              }
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
                setPicked({ for: file, range: [start, Math.max(v, start + 0.2)] })
              }
              disabled={!duration}
              aria-label="End"
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Leave the handles at the ends to keep everything. The picture is left behind, so a long
            video becomes a small file.
          </p>
        </>
      }
    />
  )
}
