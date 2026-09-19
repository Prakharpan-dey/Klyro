import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { formatBytes } from '@/lib/format'
import { useFileJob } from '@/lib/useFileJob'
import { cn } from '@/lib/utils'
import {
  scanPrivacy,
  stripPdf,
  verifyStrip,
  type PrivacyScan,
  type StripVerdict,
} from '@/ops/pdf/privacy'
import { meta } from './meta'

export default function PrivacyCheckTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [scanned, setScan] = useState<{ file?: File; scan?: PrivacyScan }>({})
  const [error, setError] = useState<string>()
  const [verdict, setVerdict] = useState<{ file?: File; result?: StripVerdict }>({})
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
  const checked = verdict.file === file ? verdict.result : undefined

  const run = () =>
    job.run(async (progress) => {
      progress(0, 2, 'Removing')
      const out = await stripPdf(file)
      progress(1, 2, 'Checking the result')
      // the input's own values, looked for in the output
      setVerdict({ file, result: await verifyStrip(out.file, scan?.secrets ?? []) })
      progress(2, 2, 'Done')
      return [out]
    })

  const workbench = file ? (
    <>
      <Panel
        label="C · Findings"
        tone="deep"
        meta={
          error ? (
            <span className="text-destructive">{error}</span>
          ) : scan ? (
            <span className={flagged.length ? 'text-egress' : 'text-local'}>
              {flagged.length
                ? `${flagged.length} of ${scan.findings.length} to review`
                : 'Nothing found by these checks'}
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
                className={cn(
                  'mt-1 size-[7px] shrink-0',
                  finding.present ? 'bg-egress' : 'bg-local',
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="font-sans text-[12.5px] text-foreground">{finding.label}</div>
                <div className="font-sans text-[11.5px] leading-snug break-words text-faint">
                  {finding.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {checked && (
        <Panel
          label="D · Verification"
          tone="deep"
          meta={
            <span className={checked.leaked.length ? 'text-destructive' : 'text-local'}>
              {checked.leaked.length ? `${checked.leaked.length} still findable` : 'Clean'}
            </span>
          }
        >
          <div className="mt-3 readout text-faint">
            <ReadoutRow
              label="Re-scanned"
              value={`${checked.scan.findings.filter((f) => f.present).length} of ${checked.scan.findings.length} flagged`}
            />
            <ReadoutRow
              label="Searched"
              value={`${formatBytes(checked.searchedBytes)}${checked.thorough ? ' uncompressed' : ' compressed only'}`}
            />
            <ReadoutRow
              label="Recorded values"
              value={
                checked.leaked.length
                  ? `${checked.leaked.join(', ')} still present`
                  : `${scan?.secrets.length ?? 0} looked for, none found`
              }
            />
          </div>
          <p className="mt-3 font-sans text-[12px] leading-relaxed text-faint">
            The output was decompressed and searched for the exact values the original recorded, in
            each of the forms a PDF can store text. That is a stronger claim than re-running the
            same checks, which would only tell you what this tool already knows to look for.
          </p>
        </Panel>
      )}
    </>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      workbench={workbench}
      outputLabel={checked ? 'E · Output' : 'D · Output'}
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
            Removing a thing from a PDF usually only unlinks it, leaving the bytes in place for
            anyone who looks. This rewrites the document from what is still reachable, so what was
            removed is genuinely not in the file — and then it checks, and shows you the check.
          </p>
        </Field>
      }
    />
  )
}
