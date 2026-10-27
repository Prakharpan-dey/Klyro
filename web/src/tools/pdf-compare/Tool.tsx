import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { comparePdfs } from '@/ops/pdf/compare'
import { meta } from './meta'

type Sensitivity = 'strict' | 'normal' | 'loose'

/** How different a pixel has to be before it counts; loose forgives rescanning noise. */
const THRESHOLD: Record<Sensitivity, number> = { strict: 12, normal: 40, loose: 90 }

export default function CompareTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal')

  const [before, after] = files.list
  const count = files.list.length

  const run = () =>
    job.run(async (progress) => {
      const result = await comparePdfs(
        before,
        after,
        { dpi: 110, threshold: THRESHOLD[sensitivity] },
        progress,
      )
      return result.outputs
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="The original first, then the new version. Drag to swap them."
      runLabel="COMPARE"
      onRun={run}
      canRun={count === 2}
      cancellable
      footnote={
        count === 2
          ? `${before.name} is the original, ${after.name} the new version`
          : count > 2
            ? 'Compare takes exactly two files — remove the extras'
            : 'Add two versions of the same document'
      }
      settings={
        <>
          <Field label="Visual sensitivity">
            <Segmented
              label="Visual sensitivity"
              value={sensitivity}
              onChange={setSensitivity}
              options={[
                { value: 'strict', label: 'Strict' },
                { value: 'normal', label: 'Normal' },
                { value: 'loose', label: 'Loose' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            You get two files: a report of every line added or removed, and the new version with
            each visual difference painted red. Use Loose for two scans of the same paper, where
            the scanner alone makes every pixel slightly different.
          </p>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Pages are matched by position. If a page was inserted, everything after it will show
            as changed, and the report says so.
          </p>
        </>
      }
    />
  )
}
