import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { parsePageList, parsePageRanges } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { splitPdf } from '@/ops/pdf/split'
import { meta } from './meta'

type Mode = 'one' | 'each'

export default function ExtractPagesTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pages, setPages] = useState('1-3')
  const [mode, setMode] = useState<Mode>('one')

  const smallest = Math.min(...files.files.map((f) => f.meta?.pages ?? Infinity))
  const known = Number.isFinite(smallest)
  const error = known
    ? mode === 'one'
      ? parsePageList(pages, smallest).error
      : parsePageRanges(pages, smallest).error
    : undefined

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        const params =
          mode === 'one'
            ? ({ mode: 'extract', pages } as const)
            : ({ mode: 'ranges', ranges: pages } as const)
        out.push(...(await splitPdf(file, params)))
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
      runLabel="EXTRACT"
      onRun={run}
      canRun={!error}
      settings={
        <>
          <Field label="Pages to keep" htmlFor="ext-pages">
            <Input
              id="ext-pages"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="1-3, 7"
              aria-invalid={Boolean(error)}
              className="h-10 text-sm"
            />
            {error && <p className="readout text-[10px] text-destructive">{error}</p>}
          </Field>

          <Field label="Output">
            <Segmented
              label="Output shape"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'one', label: 'One PDF' },
                { value: 'each', label: 'One per range' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            {mode === 'one'
              ? 'Every page you list ends up in a single PDF, in page order.'
              : 'Each comma-separated range becomes its own PDF.'}
          </p>
        </>
      }
    />
  )
}
