import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import type { Orientation, PageSize } from '@/ops/pdf/fromImages'
import { zipToPdf } from '@/ops/pdf/fromZip'
import { meta } from './meta'

export default function ZipToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pageSize, setPageSize] = useState<PageSize>('fit')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [marginMm, setMarginMm] = useState(0)

  const run = () =>
    job.run(async (progress) => [
      await zipToPdf(files.list[0], { pageSize, orientation, marginMm }, progress),
    ])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE PDF"
      onRun={run}
      cancellable
      footnote="Ordered by name, so page2 comes before page10"
      settings={
        <>
          <Field label="Page size">
            <Segmented
              label="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'fit', label: 'Fit' },
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
          </Field>

          {pageSize !== 'fit' && (
            <Field label="Orientation">
              <Segmented
                label="Orientation"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
            </Field>
          )}

          <Field label="Margin" aside={`${marginMm} mm`}>
            <Slider
              min={0}
              max={30}
              value={[marginMm]}
              onValueChange={([v]) => setMarginMm(v)}
              aria-label="Margin"
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Images become pages and any PDFs inside the archive are appended whole. Everything else
            is skipped, so a stray text file beside the scans will not stop the job.
          </p>
        </>
      }
    />
  )
}
