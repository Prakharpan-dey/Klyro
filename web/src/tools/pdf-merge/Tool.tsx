import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { mergePdfs } from '@/ops/pdf/merge'
import { meta } from './meta'

export default function MergeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [name, setName] = useState('merged')

  const pages = files.files.reduce((n, f) => n + (f.meta?.pages ?? 0), 0)
  const locked = files.files.some((f) => f.meta?.encrypted)
  const fileName = `${name.trim().replace(/\.pdf$/i, '') || 'merged'}.pdf`

  const run = () => job.run(async (progress) => [await mergePdfs(files.list, fileName, progress)])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="Drag the numbers to set the order. Files are joined top to bottom."
      runLabel="MERGE"
      onRun={run}
      canRun={files.files.length >= 2 && !locked}
      footnote={
        locked
          ? undefined
          : files.files.length < 2
            ? 'Add at least two PDFs'
            : `${files.files.length} files · ${pages || '…'} pages in total`
      }
      settings={
        <>
          <Field label="Output name" htmlFor="merge-name" aside=".pdf">
            <Input
              id="merge-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
          {locked && (
            <p className="font-sans text-[12px] leading-relaxed text-egress">
              One of the files is password protected. Remove it or unlock it first.
            </p>
          )}
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Bookmarks and form fields from the source files are not carried over.
          </p>
        </>
      }
    />
  )
}
