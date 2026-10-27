import { useState } from 'react'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
  ArrowsDownUpIcon,
} from '@phosphor-icons/react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { useFileJob } from '@/lib/useFileJob'
import { rotateImages } from '@/ops/image/edit'
import type { Flip, QuarterTurn } from '@/ops/image/geometry'
import { meta } from './meta'

const turn = (from: QuarterTurn, by: 90 | -90) => (((from + by) % 360) + 360) % 360 as QuarterTurn

export default function ImageRotateTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [rotate, setRotate] = useState<QuarterTurn>(90)
  const [flip, setFlip] = useState<Flip>('none')

  const changed = rotate !== 0 || flip !== 'none'
  const describe = [
    rotate ? `turned ${rotate}° clockwise` : '',
    flip === 'h' ? 'mirrored left to right' : flip === 'v' ? 'flipped top to bottom' : '',
  ]
    .filter(Boolean)
    .join(', then ')

  const run = () => job.run((progress) => rotateImages(files.list, { rotate, flip }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="APPLY"
      onRun={run}
      canRun={changed}
      footnote="The pixels are turned, so every app shows it the same way"
      settings={
        <>
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
            </div>
          </Field>

          <Field label="Flip">
            <div className="flex gap-2">
              <Button
                variant="outline"
                aria-pressed={flip === 'h'}
                onClick={() => setFlip((f) => (f === 'h' ? 'none' : 'h'))}
                className="aria-pressed:border-primary aria-pressed:text-primary"
              >
                <ArrowsLeftRightIcon />
                MIRROR
              </Button>
              <Button
                variant="outline"
                aria-pressed={flip === 'v'}
                onClick={() => setFlip((f) => (f === 'v' ? 'none' : 'v'))}
                className="aria-pressed:border-primary aria-pressed:text-primary"
              >
                <ArrowsDownUpIcon />
                UPSIDE DOWN
              </Button>
            </div>
          </Field>

          <p role="status" className="readout text-[11px] text-primary">
            {changed ? `Each picture will be ${describe}.` : 'No change yet.'}
          </p>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Every file in the batch gets the same turn. A photo that only looks sideways in one app
            usually carries a rotation tag that app ignores; turning it here fixes the pixels, so it
            looks right everywhere.
          </p>
        </>
      }
    />
  )
}
