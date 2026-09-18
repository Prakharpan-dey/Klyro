import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { encryptPdf } from '@/ops/pdf/qpdf'
import { meta } from './meta'

export default function EncryptTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowModifying, setAllowModifying] = useState(false)

  const mismatch = Boolean(confirm) && password !== confirm
  const ready = password.length >= 4 && password === confirm

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(
          await encryptPdf(file, {
            userPassword: password,
            allowPrinting,
            allowCopying,
            allowModifying,
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
      runLabel="ENCRYPT"
      onRun={run}
      canRun={ready}
      footnote="AES-256. Your password stays in this tab and is never sent anywhere."
      settings={
        <>
          <Field label="Password" htmlFor="enc-pw">
            <Input
              id="enc-pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>

          <Field label="Repeat password" htmlFor="enc-pw2">
            <Input
              id="enc-pw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
              className="h-10 text-sm"
            />
            {mismatch && (
              <p className="readout text-[10px] text-destructive">The passwords do not match</p>
            )}
            {!mismatch && password.length > 0 && password.length < 4 && (
              <p className="readout text-[10px] text-egress">Use at least four characters</p>
            )}
          </Field>

          <Field label="Allow the reader to">
            <div className="flex flex-col gap-2.5">
              {[
                ['Print', allowPrinting, setAllowPrinting, 'enc-print'] as const,
                ['Copy text', allowCopying, setAllowCopying, 'enc-copy'] as const,
                ['Edit', allowModifying, setAllowModifying, 'enc-edit'] as const,
              ].map(([label, value, set, id]) => (
                <div key={id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={id} className="font-sans text-[12.5px] text-soft">
                    {label}
                  </Label>
                  <Switch id={id} checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Permissions are a request to the reader software, not a guarantee. The password is what
            actually protects the file, so forgetting it means losing access.
          </p>
        </>
      }
    />
  )
}
