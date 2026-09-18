import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { findBlankPages, removeBlankPages } from '@/ops/pdf/raster'
import { formatPageList } from '@/lib/pageRange'
import { cn } from '@/lib/utils'
import { meta } from './meta'

export default function RemoveBlankTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [threshold, setThreshold] = useState(0.5)
  const [preview, setPreview] = useState<{ file?: File; coverage: number[] }>({ coverage: [] })
  const [scanning, setScanning] = useState(false)
  const file = files.list[0]

  const coverage = preview.file === file ? preview.coverage : []
  const blankNow = coverage.map((c, i) => [c, i] as const).filter(([c]) => c * 100 < threshold)

  const scan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const result = await findBlankPages(file, threshold)
      setPreview({ file, coverage: result.coverage })
    } finally {
      setScanning(false)
    }
  }

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const f of files.list) {
        out.push(await removeBlankPages(f, threshold, progress))
      }
      return out
    })

  const workbench = coverage.length ? (
    <Panel
      label="C · Ink per page"
      tone="deep"
      meta={
        <span className={blankNow.length ? 'text-egress' : 'text-local'}>
          {blankNow.length ? `${blankNow.length} would be removed` : 'None look blank'}
        </span>
      }
    >
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {coverage.map((value, index) => {
          const blank = value * 100 < threshold
          return (
            <div
              key={index}
              title={`Page ${index + 1}: ${(value * 100).toFixed(2)}% ink`}
              className={cn(
                'flex h-12 w-12 flex-col items-center justify-center border text-[10px]',
                blank
                  ? 'border-egress/50 bg-egress/10 text-egress'
                  : 'border-line-soft bg-well text-dim',
              )}
            >
              <span>{index + 1}</span>
              <span className="text-[9px]">{(value * 100).toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
      {blankNow.length > 0 && (
        <p className="mt-3 readout text-[10px] text-egress">
          Removing {formatPageList(blankNow.map(([, i]) => i))}
        </p>
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
      runLabel="REMOVE BLANKS"
      onRun={run}
      canRun={Boolean(file)}
      settings={
        <>
          <Field label="Blank if ink is under" aside={`${threshold.toFixed(1)}%`}>
            <Slider
              min={0.1}
              max={5}
              step={0.1}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              aria-label="Ink threshold"
            />
          </Field>

          <Button
            variant="outline"
            onClick={scan}
            disabled={!file || scanning}
            className="tracking-[0.1em]"
          >
            {scanning ? 'CHECKING…' : 'PREVIEW PAGES'}
          </Button>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Each page is rendered small and measured for how much of it is not white. Scanner noise
            and page numbers usually sit under half a percent.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Kept pages are copied across untouched, so quality and text are preserved.
          </p>
        </>
      }
    />
  )
}
