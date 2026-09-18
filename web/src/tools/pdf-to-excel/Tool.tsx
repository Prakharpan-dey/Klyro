import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { pdfToXlsx, type ColumnFit } from '@/ops/office/pdfToXlsx'
import { meta } from './meta'

export default function PdfToExcelTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [fit, setFit] = useState<ColumnFit>('normal')
  const [sheetPerPage, setSheetPerPage] = useState(true)
  const [parseNumbers, setParseNumbers] = useState(true)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(await pdfToXlsx(file, { fit, sheetPerPage, parseNumbers }, progress))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="CONVERT"
      onRun={run}
      footnote="Columns are guessed from the layout; check the result before trusting it."
      settings={
        <>
          <Field label="Column splitting">
            <Segmented
              label="How eagerly to split columns"
              value={fit}
              onChange={setFit}
              options={[
                { value: 'tight', label: 'More' },
                { value: 'normal', label: 'Balanced' },
                { value: 'loose', label: 'Fewer' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {fit === 'tight'
                ? 'Splits on small gaps. Use when columns sit close together.'
                : fit === 'loose'
                  ? 'Only wide gaps start a new column. Use when one cell wraps onto two lines.'
                  : 'A sensible middle for most printed tables.'}
            </p>
          </Field>

          <Field label="Workbook">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="xl-sheets" className="label">
                  One sheet per page
                </Label>
                <Switch id="xl-sheets" checked={sheetPerPage} onCheckedChange={setSheetPerPage} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="xl-numbers" className="label">
                  Read figures as numbers
                </Label>
                <Switch id="xl-numbers" checked={parseNumbers} onCheckedChange={setParseNumbers} />
              </div>
            </div>
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Nothing inside a PDF says where a table is, so the rows come from text sharing a line
            and the columns from text starting at the same place down the page. Merged cells and
            wrapped text are where it usually slips.
          </p>
        </>
      }
    />
  )
}
