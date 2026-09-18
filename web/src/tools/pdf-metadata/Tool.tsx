import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { inspectPdf, metadataToText, type PdfReport } from '@/ops/pdf/metadata'
import { meta } from './meta'

interface Row {
  name: string
  report: PdfReport
}

export default function MetadataTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [rows, setRows] = useState<Row[]>([])

  const run = () =>
    job.run(async (progress) => {
      const collected: Row[] = []
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        const report = await inspectPdf(file)
        collected.push({ name: file.name, report })
        const text = metadataToText(report, file.name)
        out.push({
          file: new File([text], `${file.name.replace(/\.pdf$/i, '')}-metadata.txt`, {
            type: 'text/plain',
          }),
          sourceName: file.name,
          sourceSize: file.size,
          note: `${report.pages} pp`,
        })
      }
      setRows(collected)
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  const workbench = rows.length ? (
    <Panel
      label="C · Findings"
      tone="deep"
      meta={<span className="text-dim">{rows.length} file(s)</span>}
    >
      <div className="mt-3.5 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.name} className="border border-line-soft bg-well p-3">
            <div className="truncate font-sans text-[13px] text-foreground">{row.name}</div>
            <div className="mt-2 readout leading-[1.9] text-faint">
              <ReadoutRow label="Pages" value={row.report.pages} />
              <ReadoutRow label="Page size" value={row.report.pageSizes.join(', ')} />
              <ReadoutRow label="Title" value={row.report.title ?? '—'} />
              <ReadoutRow label="Author" value={row.report.author ?? '—'} />
              <ReadoutRow label="Subject" value={row.report.subject ?? '—'} />
              <ReadoutRow label="Keywords" value={row.report.keywords ?? '—'} />
              <ReadoutRow label="Creator" value={row.report.creator ?? '—'} />
              <ReadoutRow label="Producer" value={row.report.producer ?? '—'} />
              <ReadoutRow label="Created" value={row.report.created ?? '—'} />
              <ReadoutRow label="Modified" value={row.report.modified ?? '—'} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      workbench={workbench}
      runLabel="READ METADATA"
      onRun={run}
      footnote="Reading happens here; nothing is sent anywhere"
      settings={
        <Field label="What you get">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Every field stored inside the PDF, plus page count and page size. Producer and creator
            often name the software, and sometimes the person, who made the file.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            A text copy of the report is offered for download.
          </p>
        </Field>
      }
    />
  )
}
