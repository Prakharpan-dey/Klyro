import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { scanPrivacy, stripPdf, type PrivacyScan } from '@/ops/pdf/privacy'
import { cn } from '@/lib/utils'
import { meta } from './meta'

export default function PrivacyCheckTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [scanned, setScan] = useState<{ file?: File; scan?: PrivacyScan }>({})
  const [error, setError] = useState<string>()
  const file = files.list[0]

  useEffect(() => {
    if (!file) return
    let cancelled = false
    scanPrivacy(file)
      .then((result) => !cancelled && (setScan({ file, scan: result }), setError(undefined)))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Unreadable PDF'))
    return () => {
      cancelled = true
    }
  }, [file])

  const scan = scanned.file === file ? scanned.scan : undefined
  const flagged = scan?.findings.filter((f) => f.present) ?? []

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Stripping hidden data')
      const out = await stripPdf(file)
      progress(1, 1, 'Done')
      setScan({ file, scan: await scanPrivacy(out.file) })
      return [out]
    })

  const workbench = file ? (
    <Panel
      label="C · Findings"
      tone="deep"
      meta={
        error ? (
          <span className="text-destructive">{error}</span>
        ) : scan ? (
          <span className={flagged.length ? 'text-egress' : 'text-local'}>
            {flagged.length ? `${flagged.length} to review` : 'Nothing hidden found'}
          </span>
        ) : (
          <span className="text-dim">Scanning…</span>
        )
      }
    >
      <div className="mt-3.5 flex flex-col gap-px border border-line-soft bg-line-soft">
        {scan?.findings.map((finding) => (
          <div key={finding.id} className="flex items-start gap-3 bg-well px-3 py-[11px]">
            <span
              className={cn('mt-1 size-[7px] shrink-0', finding.present ? 'bg-egress' : 'bg-local')}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="font-sans text-[12.5px] text-foreground">{finding.label}</div>
              <div className="font-sans text-[11.5px] leading-snug text-faint">
                {finding.detail}
              </div>
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
      runLabel="STRIP EVERYTHING"
      onRun={run}
      canRun={Boolean(file) && !error}
      footnote={
        flagged.length
          ? `${flagged.length} item(s) would be removed`
          : 'Run it anyway to be certain nothing is left behind'
      }
      settings={
        <Field label="Why this matters">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A PDF can carry your name, the software you used, earlier form values, comments,
            attachments and even scripts. None of it shows on the page, and all of it travels with
            the file when you upload it to a portal.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Stripping rewrites the document without that data. Page content is untouched, and the
            scan runs again afterwards so you can see the result.
          </p>
        </Field>
      }
    />
  )
}
