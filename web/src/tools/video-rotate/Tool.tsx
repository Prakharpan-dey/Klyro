import { useState } from 'react'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
} from '@phosphor-icons/react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useVideoProbe } from '@/components/tool/useVideoProbe'
import { VideoWorkbench } from '@/components/tool/VideoWorkbench'
import { Button } from '@/components/ui/button'
import { useFileJob } from '@/lib/useFileJob'
import { describeTurn, rotateVideo, type QuarterTurn } from '@/ops/video/ops'
import { meta } from './meta'

const turn = (from: QuarterTurn, by: 90 | -90) => ((((from + by) % 360) + 360) % 360) as QuarterTurn

export default function RotateVideoTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const state = useVideoProbe(file)
  const [rotate, setRotate] = useState<QuarterTurn>(90)
  const [flip, setFlip] = useState(false)
  const [bake, setBake] = useState<'flag' | 'pixels'>('flag')

  const changed = rotate !== 0 || flip
  const blocked = state.capability && !state.capability.ok

  const run = () =>
    job.run((progress, signal) =>
      rotateVideo(files.list, { rotate, flip, bake: bake === 'pixels' }, progress, signal),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      cancellable
      workbench={<VideoWorkbench file={file} state={state} />}
      runLabel="ROTATE"
      onRun={run}
      canRun={Boolean(file) && changed && !blocked}
      intakeHint="One clip at a time."
      footnote={
        bake === 'flag'
          ? 'Written as a flag: no re-encode, so it is quick and loses nothing'
          : 'The clip is re-encoded once, so this takes about as long as it plays'
      }
      settings={
        <>
          {blocked && (
            <p className="font-sans text-[12.5px] leading-relaxed text-egress">
              {state.capability?.reason}
            </p>
          )}

          <Field label="Turn">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRotate((r) => turn(r, -90))}>
                <ArrowCounterClockwiseIcon />
                LEFT
              </Button>
              <Button variant="outline" onClick={() => setRotate((r) => turn(r, 90))}>
                <ArrowClockwiseIcon />
                RIGHT
              </Button>
              <Button
                variant="outline"
                aria-pressed={flip}
                onClick={() => setFlip((f) => !f)}
                className="aria-pressed:border-primary aria-pressed:text-primary"
              >
                <ArrowsLeftRightIcon />
                MIRROR
              </Button>
            </div>
          </Field>

          <p role="status" className="readout text-[11px] text-primary">
            {changed ? `The clip will be ${describeTurn(rotate, flip)}.` : 'No change yet.'}
          </p>

          <Field label="How">
            <Segmented
              label="How to rotate"
              value={bake}
              onChange={setBake}
              options={[
                { value: 'flag', label: 'Quick' },
                { value: 'pixels', label: 'Turn the pixels' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Quick writes the turn into the file the way a phone does, and every current player and
            app follows it. If a site still shows it sideways after uploading, run it again with the
            pixels turned.
          </p>
        </>
      }
    />
  )
}
