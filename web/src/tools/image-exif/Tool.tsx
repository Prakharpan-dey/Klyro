import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { formatBytes } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import { cn } from '@/lib/utils'
import { readExif, stripMetadata, type ExifReport } from '@/ops/image/exif'
import { meta } from './meta'

export default function PhotoPrivacyTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [read, setRead] = useState<{ for?: File; report?: ExifReport; error?: string }>({})
  const file = files.list[0]

  useEffect(() => {
    if (!file) return
    let cancelled = false
    readExif(file)
      .then((report) => !cancelled && setRead({ for: file, report }))
      .catch(() => {
        if (!cancelled) setRead({ for: file, error: 'This image could not be read' })
      })
    return () => {
      cancelled = true
    }
  }, [file])

  const current = read.for === file ? read : {}
  const report = current.report
  const sensitive = report?.findings.filter((f) => f.sensitive) ?? []

  const run = () => job.run((progress) => stripMetadata(files.list, progress))

  const workbench = file ? (
    <Panel
      label="C · What this photo carries"
      tone="deep"
      meta={
        current.error ? (
          <span className="text-destructive">{current.error}</span>
        ) : report ? (
          <span className={report.findings.length ? 'text-egress' : 'text-local'}>
            {report.findings.length
              ? `${report.findings.length} item${report.findings.length === 1 ? '' : 's'} · ${formatBytes(report.bytes)}`
              : 'Nothing hidden in this one'}
          </span>
        ) : (
          <span className="text-dim">Reading…</span>
        )
      }
    >
      {report && report.findings.length > 0 && (
        <div className="mt-3.5 flex flex-col gap-px border border-line-soft bg-line-soft">
          {report.findings.map((finding) => (
            <div key={finding.id} className="flex items-start gap-3 bg-well px-3 py-[11px]">
              <span
                className={cn(
                  'mt-1 size-[7px] shrink-0',
                  finding.sensitive ? 'bg-egress' : 'bg-local',
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="readout text-[10px] text-faint">{finding.label}</div>
                <div className="font-sans text-[12.5px] break-words text-foreground">
                  {finding.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {report && report.findings.length === 0 && !current.error && (
        <p className="mt-3.5 font-sans text-[12.5px] leading-relaxed text-soft">
          No camera, no timestamp, no location. Either it was never there, or something has already
          taken it out. Running the tool anyway costs nothing and makes certain.
        </p>
      )}

      {files.files.length > 1 && (
        <p className="mt-3 readout text-[10px] text-faint">
          Showing the first of {files.files.length}; all of them get cleaned
        </p>
      )}
    </Panel>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      workbench={workbench}
      runLabel="REMOVE IT ALL"
      onRun={run}
      canRun={Boolean(file)}
      footnote={
        sensitive.length
          ? `${sensitive.length} of these point at a person, a place or a device`
          : 'JPG, PNG and WebP are cleaned without touching a single pixel'
      }
      settings={
        <>
          <Field label="Why this matters">
            <p className="font-sans text-[12.5px] leading-relaxed text-soft">
              A photo from a phone usually records the camera, the moment, and the exact spot on
              earth it was taken. Upload it to a portal or send it in a chat and all of that goes
              with it, invisible to you and readable by anyone who looks.
            </p>
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              The usual fix is to re-save the picture, which quietly costs you quality. This one
              rewrites the file around the same pixels instead: a JPG, PNG or WebP comes out with
              the picture bit for bit identical and only the metadata gone.
            </p>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            The other image tools here already drop metadata as a side effect of re-encoding. This
            one exists for when you want the original picture kept exactly, or just want to see what
            was in there.
          </p>
        </>
      }
    />
  )
}
