import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { useFileJob } from '@/lib/useFileJob'
import { stripAudio } from '@/ops/video/ops'
import { meta } from './meta'

export default function VideoAudioTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const [keep, setKeep] = useState<'video' | 'audio'>('video')

  const silent = state.probe && !state.probe.hasAudio
  const blocked = state.capability && !state.capability.ok

  const run = () =>
    job.run((progress, signal) => stripAudio(files.list, { keep }, progress, signal))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      workbench={<VideoWorkbench file={file} state={state} />}
      runLabel={keep === 'video' ? 'MUTE' : 'EXTRACT AUDIO'}
      onRun={run}
      canRun={Boolean(file) && !blocked && !silent}
      intakeHint="One clip at a time."
      footnote={
        silent
          ? 'This clip has no sound track to work with'
          : 'Muting is quick: the picture is copied across untouched'
      }
      settings={
        <>
          {blocked && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              {state.capability?.reason}
            </p>
          )}

          <Field label="Keep">
            <Segmented
              label="What to keep"
              value={keep}
              onChange={setKeep}
              options={[
                { value: 'video', label: 'Picture only' },
                { value: 'audio', label: 'Sound only' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {keep === 'video'
                ? 'A silent copy of the clip, same picture, smaller file'
                : 'The sound track on its own, as .m4a'}
            </p>
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Useful when a clip carries a conversation you would rather not send along with it, or
            when the sound is the only part you wanted. Either way the original stays as it is.
          </p>
        </>
      }
    />
  )
}
