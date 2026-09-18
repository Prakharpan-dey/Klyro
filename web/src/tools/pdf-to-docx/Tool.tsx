import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { pdfToDocx } from '@/ops/office/docx'
import { meta } from './meta'

export default function PdfToDocxTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pageBreaks, setPageBreaks] = useState(true)
  const [pageHeadings, setPageHeadings] = useState(false)
  const [mergeWrapped, setMergeWrapped] = useState(true)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(await pdfToDocx(file, { pageBreaks, pageHeadings, mergeWrapped }, progress))
      }
      return out
    })

  const toggles = [
    ['Keep pages apart', pageBreaks, setPageBreaks, 'dx-breaks'] as const,
    ['Label each page', pageHeadings, setPageHeadings, 'dx-heads'] as const,
    ['Rejoin wrapped lines', mergeWrapped, setMergeWrapped, 'dx-merge'] as const,
  ]

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="CONVERT"
      onRun={run}
      footnote="Text only. Layout, images and fonts do not come across."
      settings={
        <>
          <Field label="Document">
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

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A PDF stores letters at fixed positions, not paragraphs, so what you get is the words in
            reading order, ready to edit. Tables, columns and pictures are not carried over.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Scanned pages hold pictures of words rather than words, and come out empty.
          </p>
        </>
      }
    />
  )
}
