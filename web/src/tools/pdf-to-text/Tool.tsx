import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { pdfToText, type TextExportParams } from '@/ops/pdf/text'
import { meta } from './meta'

export default function PdfToTextTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [shape, setShape] = useState<TextExportParams['shape']>('joined')
  const [pageMarkers, setPageMarkers] = useState(true)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(...(await pdfToText(file, { shape, pageMarkers }, progress)))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="EXTRACT TEXT"
      onRun={run}
      footnote="Scanned pages hold pictures of words, not words; those come out empty"
      settings={
        <>
          <Field label="Output">
            <Segmented
              label="Output shape"
              value={shape}
              onChange={setShape}
              options={[
                { value: 'joined', label: 'One file' },
                { value: 'per-page', label: 'One per page' },
              ]}
            />
          </Field>

          {shape === 'joined' && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="tt-markers" className="label">
                Mark where pages start
              </Label>
              <Switch id="tt-markers" checked={pageMarkers} onCheckedChange={setPageMarkers} />
            </div>
          )}

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Line breaks are rebuilt from the position of each piece of text, so the result reads
            closely to the page without copying its layout.
          </p>
        </>
      }
    />
  )
}
