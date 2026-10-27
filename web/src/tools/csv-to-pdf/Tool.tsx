import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { SheetFields } from '@/components/tool/SheetFields'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useSheetParams } from '@/components/tool/useSheetParams'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import type { Delimiter } from '@/ops/office/csv'
import { excelToPdf } from '@/ops/office/excelToPdf'
import { meta } from './meta'

type DelimiterChoice = 'auto' | 'comma' | 'semicolon' | 'tab'

const DELIMITERS: Record<Exclude<DelimiterChoice, 'auto'>, Delimiter> = {
  comma: ',',
  semicolon: ';',
  tab: '\t',
}

export default function CsvToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  // a CSV export is usually a few columns of records, which reads better upright
  const sheet = useSheetParams({ landscape: false })
  const [delimiter, setDelimiter] = useState<DelimiterChoice>('auto')

  const run = () =>
    job.run(async (progress) => {
      const chosen = delimiter === 'auto' ? undefined : DELIMITERS[delimiter]
      const out = []
      for (const file of files.list) {
        out.push(await excelToPdf(file, sheet.params, progress, chosen))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE PDF"
      onRun={run}
      footnote="Quoted fields and leading zeros are kept as written"
      settings={
        <>
          <Field label="Separator">
            <Segmented
              label="Separator"
              value={delimiter}
              onChange={setDelimiter}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'comma', label: ',' },
                { value: 'semicolon', label: ';' },
                { value: 'tab', label: 'Tab' },
              ]}
            />
          </Field>

          <SheetFields sheet={sheet} />

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Auto picks whichever separator gives every row the same number of columns, which also
            catches the semicolon exports Excel writes across most of Europe.
          </p>
        </>
      }
    />
  )
}
