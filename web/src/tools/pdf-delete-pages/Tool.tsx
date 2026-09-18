import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { formatPageList, parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { deletePages } from '@/ops/pdf/pages'
import { meta } from './meta'

export default function DeletePagesTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pages, setPages] = useState('1')

  const smallest = Math.min(...files.files.map((f) => f.meta?.pages ?? Infinity))
  const parsed = Number.isFinite(smallest) ? parsePageList(pages, smallest) : undefined
  const keeping =
    parsed && !parsed.error && Number.isFinite(smallest)
      ? smallest - parsed.pages.length
      : undefined

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        const count = files.files[i].meta?.pages ?? 1
        const list = parsePageList(pages, count)
        if (list.error) throw new Error(`${file.name}: ${list.error}`)
        if (list.pages.length >= count) throw new Error(`${file.name}: that removes every page`)
        out.push(await deletePages(file, list.pages))
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
      runLabel="DELETE PAGES"
      onRun={run}
      canRun={Boolean(parsed) && !parsed?.error}
      footnote={
        parsed && !parsed.error && keeping !== undefined
          ? `Removing ${formatPageList(parsed.pages) || 'nothing'} · ${keeping} pages left`
          : undefined
      }
      settings={
        <Field label="Pages to remove" htmlFor="del-pages">
          <Input
            id="del-pages"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="2, 5-7"
            aria-invalid={Boolean(parsed?.error)}
            className="h-10 text-sm"
          />
          {parsed?.error ? (
            <p className="readout text-[10px] text-destructive">{parsed.error}</p>
          ) : (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              Page numbers are 1-based. Your original file is never changed.
            </p>
          )}
        </Field>
      }
    />
  )
}
