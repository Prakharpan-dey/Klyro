import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { useFileJob } from '@/lib/useFileJob'
import { rebuildPdf } from '@/ops/pdf/pages'
import { meta } from './meta'
import { PageGrid, type PageCard } from './PageGrid'
import { usePdfThumbnails } from './usePdfThumbnails'

function freshPages(count: number): PageCard[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    index,
    rotate: 0,
    deleted: false,
  }))
}

export default function OrganizeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]
  const thumbs = usePdfThumbnails(file)

  // edits are tied to the file they were made on; a new file starts clean
  const [edited, setEdited] = useState<{ file?: File; pages: PageCard[] }>({ pages: [] })
  const current = (state: typeof edited) =>
    state.file === file && state.pages.length ? state.pages : freshPages(thumbs.count)
  const pages = current(edited)
  const updatePages = (update: (pages: PageCard[]) => PageCard[]) =>
    setEdited((prev) => ({ file, pages: update(current(prev)) }))
  const setPages = (next: PageCard[]) => updatePages(() => next)

  const kept = pages.filter((p) => !p.deleted)
  const removed = pages.length - kept.length
  const rotated = kept.filter((p) => p.rotate).length
  const moved = kept.some((p, i) => p.index !== i) || removed > 0
  const changed = removed > 0 || rotated > 0 || moved
  const running = job.status === 'running'

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Writing pages')
      const out = await rebuildPdf(
        file,
        kept.map((p) => ({ index: p.index, rotate: p.rotate })),
        '-organized',
      )
      progress(1, 1, 'Done')
      return [out]
    })

  const rotateAll = (deg: number) =>
    updatePages((prev) =>
      prev.map((p) => (p.deleted ? p : { ...p, rotate: (p.rotate + deg + 360) % 360 })),
    )

  const workbench = file ? (
    <Panel
      label="C · Pages"
      tone="deep"
      meta={
        thumbs.error ? (
          <span className="text-destructive">{thumbs.error}</span>
        ) : (
          <span className="text-dim">
            {thumbs.urls.filter(Boolean).length} / {thumbs.count} rendered
          </span>
        )
      }
    >
      {pages.length > 0 && (
        <>
          <div className="mt-3.5 mb-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={running} onClick={() => rotateAll(270)}>
              ROTATE ALL LEFT
            </Button>
            <Button variant="outline" size="sm" disabled={running} onClick={() => rotateAll(90)}>
              ROTATE ALL RIGHT
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => updatePages((prev) => [...prev].reverse())}
            >
              REVERSE ORDER
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={running || !changed}
              onClick={() => setPages(freshPages(thumbs.count))}
              className="text-faint"
            >
              RESET
            </Button>
          </div>
          <PageGrid pages={pages} thumbs={thumbs.urls} onChange={updatePages} disabled={running} />
        </>
      )}
    </Panel>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      workbench={workbench}
      intakeHint="One PDF at a time. Its pages show up below."
      runLabel="SAVE PDF"
      onRun={run}
      canRun={pages.length > 0 && kept.length > 0 && changed && !thumbs.error}
      footnote={
        pages.length
          ? `${kept.length} of ${pages.length} pages kept · ${rotated} rotated`
          : undefined
      }
      settings={
        <Field label="How it works">
          <ul className="flex flex-col gap-2 font-sans text-[12.5px] leading-relaxed text-soft">
            <li>Drag a page to move it.</li>
            <li>Use the arrows to rotate a page, or the bin to remove it.</li>
            <li>Nothing changes in your original file — a new PDF is saved.</li>
          </ul>
          {kept.length === 0 && pages.length > 0 && (
            <p className="readout text-[10px] text-destructive">Keep at least one page</p>
          )}
        </Field>
      }
    />
  )
}
