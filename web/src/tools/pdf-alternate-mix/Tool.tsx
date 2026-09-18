import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { alternateMix } from '@/ops/pdf/arrange'
import { meta } from './meta'

export default function AlternateMixTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [reverseSecond, setReverseSecond] = useState(false)
  const [step, setStep] = useState('1')

  const stepValue = Number(step)
  const stepValid = Number.isInteger(stepValue) && stepValue >= 1 && stepValue <= 10
  const ready = files.files.length === 2 && stepValid

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Interleaving pages')
      const out = await alternateMix(files.list, { reverseSecond, step: stepValue })
      progress(1, 1, 'Done')
      return [out]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="Exactly two PDFs. The first one starts the sequence."
      runLabel="MIX"
      onRun={run}
      canRun={ready}
      footnote={
        files.files.length === 2
          ? undefined
          : `Add ${files.files.length < 2 ? 'a second PDF' : 'exactly two PDFs'}`
      }
      settings={
        <>
          <Field label="Pages from each turn" htmlFor="mix-step">
            <Input
              id="mix-step"
              type="number"
              min={1}
              max={10}
              value={step}
              onChange={(e) => setStep(e.target.value)}
              aria-invalid={!stepValid}
              className="h-10 text-base"
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mix-reverse" className="label">
              Read the second backwards
            </Label>
            <Switch id="mix-reverse" checked={reverseSecond} onCheckedChange={setReverseSecond} />
          </div>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Scanned a stack of double-sided pages twice? Scan the fronts, flip the stack, scan the
            backs, then turn this on so the backs line up with their fronts. Leftover pages are
            added at the end.
          </p>
        </>
      }
    />
  )
}
