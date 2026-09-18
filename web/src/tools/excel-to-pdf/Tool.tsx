import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { excelToPdf, type ExcelToPdfParams } from '@/ops/office/excelToPdf'
import type { FontFamily } from '@/ops/pdf/stamp'
import { meta } from './meta'

export default function ExcelToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pageSize, setPageSize] = useState<ExcelToPdfParams['pageSize']>('a4')
  const [landscape, setLandscape] = useState(true)
  const [family, setFamily] = useState<FontFamily>('helvetica')
  const [size, setSize] = useState(9)
  const [marginMm, setMarginMm] = useState(14)
  const [headerRow, setHeaderRow] = useState(true)
  const [gridLines, setGridLines] = useState(true)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(
          await excelToPdf(
            file,
            { pageSize, landscape, family, size, marginMm, headerRow, gridLines },
            progress,
          ),
        )
      }
      return out
    })

  const toggles = [
    ['Landscape', landscape, setLandscape, 'xp-land'] as const,
    ['Repeat the first row', headerRow, setHeaderRow, 'xp-head'] as const,
    ['Draw grid lines', gridLines, setGridLines, 'xp-grid'] as const,
  ]

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE PDF"
      onRun={run}
      footnote="Values as they are stored: no colours, no charts, no formulas"
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
              ]}
            />
          </Field>

          <Field label="Font">
            <Segmented
              label="Font"
              value={family}
              onChange={setFamily}
              options={[
                { value: 'helvetica', label: 'Sans' },
                { value: 'times', label: 'Serif' },
                { value: 'courier', label: 'Mono' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size" aside={`${size} pt`}>
              <Slider
                min={6}
                max={14}
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                aria-label="Font size"
              />
            </Field>
            <Field label="Margin" aside={`${marginMm} mm`}>
              <Slider
                min={6}
                max={30}
                value={[marginMm]}
                onValueChange={([v]) => setMarginMm(v)}
                aria-label="Margin"
              />
            </Field>
          </div>

          <Field label="Layout">
            <div className="flex flex-col gap-2.5">
              {toggles.map(([label, value, set, id]) => (
                <div key={id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={id} className="label">
                    {label}
                  </Label>
                  <Switch id={id} checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Every sheet starts on a new page. Columns too wide for the paper are trimmed with an
            ellipsis, so nothing silently runs off the edge.
          </p>
        </>
      }
    />
  )
}
