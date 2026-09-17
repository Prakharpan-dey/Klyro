import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { chunkPages, parsePageList, parsePageRanges } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { splitPdf, type SplitParams } from '@/ops/pdf/split'
import { meta } from './meta'

type Mode = SplitParams['mode']

export default function SplitTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [mode, setMode] = useState<Mode>('ranges')
  const [ranges, setRanges] = useState('1-2, 3-')
  const [size, setSize] = useState('1')
  const [pages, setPages] = useState('1')

  const current = files.files[0]
  const count = current?.meta?.pages

  // live preview of what will be written, once the page count is known
  let preview = ''
  let error: string | undefined
  if (count) {
    if (mode === 'ranges') {
      const r = parsePageRanges(ranges, count)
      error = r.error
      preview = `${r.groups.length} file${r.groups.length === 1 ? '' : 's'}`
    } else if (mode === 'every') {
      const n = Number(size)
      if (!Number.isInteger(n) || n < 1) error = 'Enter a whole number of pages'
      else preview = `${chunkPages(count, n).length} files`
    } else {
      const r = parsePageList(pages, count)
      error = r.error
      preview = `1 file · ${r.pages.length} page${r.pages.length === 1 ? '' : 's'}`
    }
  }

  const params: SplitParams =
    mode === 'ranges'
      ? { mode, ranges }
      : mode === 'every'
        ? { mode, size: Number(size) }
        : { mode, pages }

  const run = () => job.run((progress) => splitPdf(files.list[0], params, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="SPLIT"
      onRun={run}
      canRun={Boolean(count) && !error}
      footnote={count && !error ? `${count} pages in · ${preview} out` : undefined}
      settings={
        <>
          <Field label="Split by">
            <Segmented
              label="Split mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'ranges', label: 'Ranges' },
                { value: 'every', label: 'Every N' },
                { value: 'extract', label: 'Extract' },
              ]}
            />
          </Field>

          {mode === 'ranges' && (
            <Field label="Ranges" htmlFor="split-ranges" aside="one file each">
              <Input
                id="split-ranges"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                aria-invalid={Boolean(error)}
                placeholder="1-3, 4-6, 7-"
                className="h-10 text-sm"
              />
            </Field>
          )}
          {mode === 'every' && (
            <Field label="Pages per file" htmlFor="split-size">
              <Input
                id="split-size"
                type="number"
                min={1}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-invalid={Boolean(error)}
                className="h-10 text-base"
              />
            </Field>
          )}
          {mode === 'extract' && (
            <Field label="Pages to keep" htmlFor="split-pages" aside="into one file">
              <Input
                id="split-pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                aria-invalid={Boolean(error)}
                placeholder="1, 3, 5-7"
                className="h-10 text-sm"
              />
            </Field>
          )}

          {error ? (
            <p className="readout text-[10px] text-destructive">{error}</p>
          ) : (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              Use commas between parts. <span className="font-mono">8-</span> means page 8 to the
              end.
            </p>
          )}
          {current?.meta?.encrypted && (
            <p className="font-sans text-[12px] text-egress">This PDF is password protected.</p>
          )}
        </>
      }
    />
  )
}
