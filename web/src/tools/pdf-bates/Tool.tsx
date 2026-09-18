import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { stampText, type Anchor } from '@/ops/pdf/stamp'
import { meta } from './meta'

export default function BatesTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [prefix, setPrefix] = useState('KLY-')
  const [suffix, setSuffix] = useState('')
  const [start, setStart] = useState('1')
  const [digits, setDigits] = useState(6)
  const [anchor, setAnchor] = useState<Anchor>('bottom-right')

  const startAt = Number(start)
  const valid = Number.isInteger(startAt) && startAt >= 0

  const preview = `${prefix}${String(startAt).padStart(digits, '0')}${suffix}`

  const run = () =>
    job.run(async (progress) => {
      const out = []
      // the counter runs across every file, which is the point of Bates numbering
      let counter = startAt
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        const first = counter
        const result = await stampText(file, {
          textFor: (index) => `${prefix}${String(first + index).padStart(digits, '0')}${suffix}`,
          anchor,
          family: 'courier',
          size: 9,
          marginMm: 10,
          suffix: '-bates',
        })
        counter = first + (files.files[i].meta?.pages ?? 1)
        out.push(result)
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
      intakeHint="Numbering continues from one file to the next, in this order."
      sortable
      runLabel="APPLY NUMBERING"
      onRun={run}
      canRun={valid}
      footnote={valid ? `First stamp: ${preview}` : 'Start number must be a whole number'}
      settings={
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prefix" htmlFor="bt-prefix">
              <Input
                id="bt-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                maxLength={12}
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Suffix" htmlFor="bt-suffix">
              <Input
                id="bt-suffix"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                maxLength={12}
                className="h-10 text-sm"
              />
            </Field>
          </div>

          <Field label="Start at" htmlFor="bt-start">
            <Input
              id="bt-start"
              type="number"
              min={0}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-invalid={!valid}
              className="h-10 text-base"
            />
          </Field>

          <Field label="Digits" aside={String(digits)}>
            <Slider
              min={1}
              max={10}
              value={[digits]}
              onValueChange={([v]) => setDigits(v)}
              aria-label="Digits"
            />
          </Field>

          <Field label="Position">
            <AnchorPicker value={anchor} onChange={setAnchor} edgesOnly />
          </Field>
        </>
      }
    />
  )
}
