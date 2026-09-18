import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { rotatePages } from '@/ops/pdf/pages'
import { meta } from './meta'

type Scope = 'all' | 'pages'

export default function RotateTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [degrees, setDegrees] = useState<'90' | '180' | '270'>('90')
  const [scope, setScope] = useState<Scope>('all')
  const [pages, setPages] = useState('1')

  // validate against the smallest document so the same input works for every file
  const smallest = Math.min(...files.files.map((f) => f.meta?.pages ?? Infinity))
  const error =
    scope === 'pages' && Number.isFinite(smallest)
      ? parsePageList(pages, smallest).error
      : undefined

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        let target: number[] | 'all' = 'all'
        if (scope === 'pages') {
          const parsed = parsePageList(pages, files.files[i].meta?.pages ?? 1)
          if (parsed.error) throw new Error(`${file.name}: ${parsed.error}`)
          target = parsed.pages
        }
        out.push(await rotatePages(file, target, Number(degrees) as 90 | 180 | 270))
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
      runLabel="ROTATE"
      onRun={run}
      canRun={!error}
      footnote="Rotation is stored in the page, so text stays selectable"
      settings={
        <>
          <Field label="Turn clockwise by">
            <Segmented
              label="Rotation"
              value={degrees}
              onChange={setDegrees}
              options={[
                { value: '90', label: '90°' },
                { value: '180', label: '180°' },
                { value: '270', label: '270°' },
              ]}
            />
          </Field>

          <Field label="Apply to">
            <Segmented
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'All pages' },
                { value: 'pages', label: 'Chosen pages' },
              ]}
            />
          </Field>

          {scope === 'pages' && (
            <Field label="Pages" htmlFor="rot-pages">
              <Input
                id="rot-pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="1, 3-5"
                aria-invalid={Boolean(error)}
                className="h-10 text-sm"
              />
              {error && <p className="readout text-[10px] text-destructive">{error}</p>}
            </Field>
          )}
        </>
      }
    />
  )
}
