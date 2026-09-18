import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { dividePages, type DivideMode } from '@/ops/pdf/geometry'
import { meta } from './meta'

export default function DivideTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [mode, setMode] = useState<DivideMode>('vertical')

  const pages = files.files.reduce((n, f) => n + (f.meta?.pages ?? 0), 0)
  const multiplier = mode === 'quarters' ? 4 : 2

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await dividePages(file, mode))
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="DIVIDE PAGES"
      onRun={run}
      footnote={pages ? `${pages} pages in · ${pages * multiplier} out` : undefined}
      settings={
        <>
          <Field label="Cut each page">
            <Segmented
              label="Divide mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'vertical', label: 'Left | Right' },
                { value: 'horizontal', label: 'Top / Bottom' },
                { value: 'quarters', label: 'Quarters' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A book scanned flat puts two pages on one sheet. Cutting vertically gives you one page
            per page again, in reading order.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Parts come out in reading order: left then right, top then bottom.
          </p>
        </>
      }
    />
  )
}
