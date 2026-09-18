import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { decryptPdf } from '@/ops/pdf/qpdf'
import { meta } from './meta'

export default function DecryptTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [password, setPassword] = useState('')

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await decryptPdf(file, password))
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
      runLabel="REMOVE PASSWORD"
      onRun={run}
      canRun={files.files.length > 0}
      footnote="Only works with the password; this cannot break encryption."
      settings={
        <>
          <Field label="Current password" htmlFor="dec-pw">
            <Input
              id="dec-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty if it only blocks editing"
              className="h-10 text-sm"
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Useful when a bank statement or admit card asks for a password every time you open it,
            and you would rather keep an unlocked copy on your own machine.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Some files carry no open password but still block printing or copying. For those, leave
            the box empty.
          </p>
        </>
      }
    />
  )
}
