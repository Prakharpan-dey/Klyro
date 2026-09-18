import { useEffect, useState } from 'react'
import { Dropzone } from '@/components/console/Dropzone'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { commonName, readCertificate, signPdf } from '@/ops/pdf/sign'
import { meta } from './meta'

const CERT_ACCEPT = ['application/x-pkcs12', '.p12', '.pfx']

export default function SignCertificateTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [certificate, setCertificate] = useState<File>()
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [location, setLocation] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [read, setRead] = useState<{
    for?: File
    password?: string
    signer?: string
    until?: string
    error?: string
  }>({})

  // try the certificate as soon as there is something to try it with, so a
  // wrong password is caught before a long run rather than after it
  useEffect(() => {
    if (!certificate || !password) return
    let cancelled = false
    const timer = setTimeout(() => {
      readCertificate(certificate, password)
        .then((signer) => {
          if (cancelled) return
          setRead({
            for: certificate,
            password,
            signer: commonName(signer.certificate.subject),
            until: signer.certificate.validity.notAfter.toLocaleDateString(),
          })
          setName((current) => current || commonName(signer.certificate.subject))
        })
        .catch((err) => {
          if (!cancelled) {
            setRead({
              for: certificate,
              password,
              error: err instanceof Error ? err.message : 'Unreadable',
            })
          }
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [certificate, password])

  // only speak about the certificate currently in the boxes
  const status = read.for === certificate && read.password === password ? read : {}

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(
          await signPdf(file, {
            certificate: certificate as File,
            password,
            name,
            reason,
            location,
            contactInfo,
          }),
        )
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="SIGN"
      onRun={run}
      canRun={Boolean(certificate && password && files.files.length)}
      footnote="Your certificate and its password stay in this tab."
      settings={
        <>
          <Field label="Certificate">
            <Dropzone
              onFiles={(picked) => setCertificate(picked[0])}
              accept={CERT_ACCEPT}
              multiple={false}
              hint=".p12 or .pfx, the file holding your key"
            />
            {certificate && (
              <p className="readout text-[10px] text-dim">
                {certificate.name} · {(certificate.size / 1024).toFixed(1)} KB
              </p>
            )}
          </Field>

          <Field label="Certificate password" htmlFor="sig-pw">
            <Input
              id="sig-pw"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-sm"
            />
            {status.signer && (
              <p className="readout text-[10px] text-local">
                {status.signer} · valid to {status.until}
              </p>
            )}
            {status.error && <p className="readout text-[10px] text-destructive">{status.error}</p>}
          </Field>

          <Field label="Shown to whoever opens it" htmlFor="sig-name">
            <Input
              id="sig-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Reason" htmlFor="sig-reason">
              <Input
                id="sig-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I approve this"
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Place" htmlFor="sig-place">
              <Input
                id="sig-place"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Pune"
                className="h-10 text-sm"
              />
            </Field>
          </div>

          <Field label="Contact" htmlFor="sig-contact">
            <Input
              id="sig-contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Email or phone"
              className="h-10 text-sm"
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            This is the cryptographic kind of signature: a reader can tell whether a single byte
            changed after you signed. For a signature people can see on the page, use Sign PDF and
            draw one.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            A certificate you made yourself proves nothing about who you are, only that the file has
            not changed. Readers trust it when a certificate authority issued it.
          </p>
        </>
      }
    />
  )
}
