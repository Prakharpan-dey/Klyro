import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { insertBlankPages, type InsertBlankParams } from '@/ops/pdf/arrange'
import { meta } from './meta'

export default function InsertBlankTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [positions, setPositions] = useState('1')
  const [where, setWhere] = useState<InsertBlankParams['where']>('after')
  const [count, setCount] = useState('1')
  const [size, setSize] = useState<InsertBlankParams['size']>('match')

  const pageCount = files.files[0]?.meta?.pages
  const parsed = pageCount ? parsePageList(positions, pageCount) : undefined
  const blanks = Number(count)
  const countValid = Number.isInteger(blanks) && blanks >= 1 && blanks <= 20

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Inserting pages')
      const out = await insertBlankPages(files.list[0], { positions, where, count: blanks, size })
      progress(1, 1, 'Done')
      return [out]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="INSERT PAGES"
      onRun={run}
      canRun={Boolean(pageCount) && !parsed?.error && countValid}
      footnote={
        pageCount && parsed && !parsed.error
          ? `${pageCount} pages in · ${pageCount + parsed.pages.length * blanks} out`
          : undefined
      }
      settings={
        <>
          <Field label="At page" htmlFor="ins-pos">
            <Input
              id="ins-pos"
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
              placeholder="1, 4-6"
              aria-invalid={Boolean(parsed?.error)}
              className="h-10 text-sm"
            />
            {parsed?.error && (
              <p className="readout text-[10px] text-destructive">{parsed.error}</p>
            )}
          </Field>

          <Field label="Position">
            <Segmented
              label="Position"
              value={where}
              onChange={setWhere}
              options={[
                { value: 'before', label: 'Before' },
                { value: 'after', label: 'After' },
              ]}
            />
          </Field>

          <Field label="How many each time" htmlFor="ins-count">
            <Input
              id="ins-count"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              aria-invalid={!countValid}
              className="h-10 text-base"
            />
          </Field>

          <Field label="Blank page size">
            <Segmented
              label="Blank page size"
              value={size}
              onChange={setSize}
              options={[
                { value: 'match', label: 'Match' },
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </Field>
        </>
      }
    />
  )
}
