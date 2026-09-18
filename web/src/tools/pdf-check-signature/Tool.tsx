import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { signatureReportText, verifySignatures, type SignatureReport } from '@/ops/pdf/verifySign'
import { cn } from '@/lib/utils'
import { meta } from './meta'

function Line({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 bg-well px-3 py-2">
      <span className="readout text-[10px] text-faint">{label}</span>
      <span
        className={cn(
          'font-sans text-[12.5px] text-right',
          good === undefined ? 'text-soft' : good ? 'text-local' : 'text-egress',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export default function CheckSignatureTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [checked, setChecked] = useState<{
    file?: File
    reports?: SignatureReport[]
    error?: string
  }>({})
  const file = files.list[0]

  useEffect(() => {
    if (!file) return
    let cancelled = false
    verifySignatures(file)
      .then((reports) => !cancelled && setChecked({ file, reports }))
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'This PDF could not be read'
        setChecked({ file, reports: [], error: message })
      })
    return () => {
      cancelled = true
    }
  }, [file])

  const current = checked.file === file ? checked : {}
  const reports = current.reports
  const error = current.error
  const sound = reports?.every((r) => r.contentMatches && r.signatureValid && r.coversWholeFile)

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Writing the report')
      const text = signatureReportText(file.name, reports ?? [])
      progress(1, 1, 'Done')
      return [
        {
          file: new File([text], `${file.name.replace(/\.pdf$/i, '')}-signature.txt`, {
            type: 'text/plain',
          }),
          sourceName: file.name,
          sourceSize: file.size,
        },
      ]
    })

  const workbench = file ? (
    <Panel
      label="C · Signatures"
      tone="deep"
      meta={
        error ? (
          <span className="text-dim">{error}</span>
        ) : reports?.length ? (
          <span className={sound ? 'text-local' : 'text-egress'}>
            {reports.length} signature{reports.length === 1 ? '' : 's'} ·{' '}
            {sound ? 'all sound' : 'needs a look'}
          </span>
        ) : (
          <span className="text-dim">Checking…</span>
        )
      }
    >
      <div className="mt-3.5 flex flex-col gap-4">
        {reports?.map((report) => (
          <div
            key={report.index}
            className="flex flex-col gap-px border border-line-soft bg-line-soft"
          >
            <Line label="Signer" value={report.signer} />
            <Line
              label="Issued by"
              value={report.selfSigned ? `${report.issuer} (self-signed)` : report.issuer}
            />
            <Line
              label="Signed"
              value={report.signedAt ? report.signedAt.toLocaleString() : 'not stated'}
            />
            {report.reason && <Line label="Reason" value={report.reason} />}
            {report.location && <Line label="Place" value={report.location} />}
            <Line
              label="Content"
              value={report.contentMatches ? 'unchanged since signing' : 'changed after signing'}
              good={report.contentMatches}
            />
            <Line
              label="Signature"
              value={report.signatureValid ? `valid · ${report.algorithm}` : 'does not verify'}
              good={report.signatureValid}
            />
            <Line
              label="Coverage"
              value={
                report.coversWholeFile
                  ? 'the whole file'
                  : `${report.unsignedBytes} bytes left unsigned`
              }
              good={report.coversWholeFile}
            />
            <Line
              label="Certificate"
              value={`${report.certificateFrom.toLocaleDateString()} to ${report.certificateTo.toLocaleDateString()}`}
              good={report.certificateCurrent}
            />
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
      runLabel="SAVE REPORT"
      onRun={run}
      canRun={Boolean(reports?.length)}
      footnote={
        reports?.length
          ? 'Checked in this tab; nothing was sent anywhere'
          : 'Drop a signed PDF to see who signed it'
      }
      settings={
        <Field label="What is checked">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Two separate things. Whether the signature matches the bytes it covers, which tells you
            the document has not been edited. And whether it covers the whole file, because a page
            appended afterwards sits outside the signature and stays unsigned.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Who the signer is depends on the certificate authority that issued their certificate.
            That part is a matter of trust, not maths, so it is reported rather than judged.
          </p>
        </Field>
      }
    />
  )
}
