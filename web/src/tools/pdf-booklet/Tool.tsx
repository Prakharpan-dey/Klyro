import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { makeBooklet } from '@/ops/pdf/geometry'
import { meta } from './meta'

export default function BookletTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [size, setSize] = useState<'a4' | 'letter'>('a4')

  const pages = files.files[0]?.meta?.pages
  const sheets = pages ? Math.ceil(pages / 4) * 2 : undefined

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await makeBooklet(file, size))
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
      runLabel="MAKE BOOKLET"
      onRun={run}
      footnote={
        sheets
          ? `${pages} pages · ${sheets} printed sides · fold in the middle`
          : 'Page count is rounded up to a multiple of four'
      }
      settings={
        <>
          <Field label="Sheet size">
            <Segmented
              label="Sheet size"
              value={size}
              onChange={setSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </Field>

          <Field label="How to print it">
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 font-sans text-[12.5px] leading-relaxed text-soft">
              <li>Print the result double sided, flipping on the short edge.</li>
              <li>Stack the sheets in order.</li>
              <li>Fold the stack in half and staple the fold.</li>
            </ol>
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              Pages are placed two to a landscape sheet in saddle-stitch order, so the folded
              booklet reads 1, 2, 3 and so on. Missing pages at the end are left blank.
            </p>
          </Field>
        </>
      }
    />
  )
}
