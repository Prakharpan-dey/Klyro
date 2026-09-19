import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { useFileJob } from '@/lib/useFileJob'
import { containerOf, defaultAudioCodec, defaultVideoCodec } from '@/ops/video/compatibility'
import { convertVideo } from '@/ops/video/ops'
import type { VideoContainer } from '@/ops/video/compatibility'
import { meta } from './meta'

export default function ConvertVideoTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const [container, setContainer] = useState<VideoContainer>('mp4')

  const source = file ? containerOf(file) : undefined
  const same = source === container
  const blocked = state.capability && !state.capability.ok

  const run = () =>
    job.run((progress, signal) => convertVideo(files.list, { container }, progress, signal))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      workbench={<VideoWorkbench file={file} state={state} />}
      runLabel="CONVERT"
      onRun={run}
      canRun={Boolean(file) && !blocked}
      intakeHint="One clip at a time."
      footnote={
        same
          ? 'That is the format it is already in — it will be rewritten, not converted'
          : `Video becomes ${defaultVideoCodec(container).toUpperCase()}, sound becomes ${defaultAudioCodec(container).toUpperCase()}`
      }
      settings={
        <>
          {blocked && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              {state.capability?.reason}
            </p>
          )}

          <Field label="Convert to">
            <Segmented
              label="Container"
              value={container}
              onChange={setContainer}
              options={[
                { value: 'mp4', label: 'MP4' },
                { value: 'webm', label: 'WebM' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {container === 'mp4'
                ? 'H.264 and AAC — the pair every phone, TV and upload form accepts'
                : 'VP9 and Opus — smaller at the same quality, and open'}
            </p>
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A container can only hold certain codecs, so the pairing is chosen for you: AAC cannot
            go inside WebM and VP9 cannot go inside MP4. Where the original track already fits, it
            is copied across rather than re-encoded, which is both faster and lossless.
          </p>
        </>
      }
    />
  )
}
