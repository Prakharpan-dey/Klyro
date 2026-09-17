import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { imagesToPdf, type Orientation, type PageSize } from '@/ops/pdf/fromImages'
import { meta } from './meta'

export default function ImagesToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [margin, setMargin] = useState(10)
  const [name, setName] = useState('scans')

  const run = () =>
    job.run(async (progress) => [
      await imagesToPdf(
        files.list,
        {
          pageSize,
          orientation,
          marginMm: margin,
          name: `${name.trim().replace(/\.pdf$/i, '') || 'scans'}.pdf`,
        },
        progress,
      ),
    ])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="One image per page, in this order. Drag the numbers to change it."
      runLabel="MAKE PDF"
      onRun={run}
      footnote={
        files.files.length
          ? `${files.files.length} page${files.files.length === 1 ? '' : 's'}`
          : undefined
      }
      settings={
        <>
          <Field label="Page size">
            <Segmented
              label="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
                { value: 'fit', label: 'Fit image' },
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

          <Field label="Margin" aside={`${margin} mm`}>
            <Slider
              min={0}
              max={30}
              step={1}
              value={[margin]}
              onValueChange={([v]) => setMargin(v)}
              aria-label="Margin in millimetres"
            />
          </Field>

          <Field label="Output name" htmlFor="i2p-name" aside=".pdf">
            <Input
              id="i2p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
        </>
      }
    />
  )
}
