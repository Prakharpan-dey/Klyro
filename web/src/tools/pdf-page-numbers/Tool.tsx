import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { fillTemplate, stampText, type Anchor, type FontFamily } from '@/ops/pdf/stamp'
import { meta } from './meta'

const FORMATS = [
  { value: '{n}', label: '1' },
  { value: '{n} / {total}', label: '1 / 10' },
  { value: 'Page {n} of {total}', label: 'Page 1 of 10' },
]

export default function PageNumbersTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [format, setFormat] = useState(FORMATS[0].value)
  const [anchor, setAnchor] = useState<Anchor>('bottom-center')
  const [start, setStart] = useState('1')
  const [skipFirst, setSkipFirst] = useState('0')
  const [size, setSize] = useState(11)
  const [family, setFamily] = useState<FontFamily>('helvetica')

  const startAt = Number(start)
  const skip = Number(skipFirst)
  const valid = Number.isInteger(startAt) && Number.isInteger(skip) && skip >= 0

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(
          await stampText(file, {
            textFor: (index, count) =>
              index < skip ? '' : fillTemplate(format, startAt + index - skip, count - skip),
            anchor,
            family,
            size,
            marginMm: 12,
            suffix: '-numbered',
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
      runLabel="ADD NUMBERS"
      onRun={run}
      canRun={valid}
      settings={
        <>
          <Field label="Format">
            <Segmented
              label="Number format"
              value={format}
              onChange={setFormat}
              options={FORMATS}
            />
          </Field>

          <Field label="Position">
            <AnchorPicker value={anchor} onChange={setAnchor} edgesOnly />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start at" htmlFor="pn-start">
              <Input
                id="pn-start"
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10 text-base"
              />
            </Field>
            <Field label="Skip first" htmlFor="pn-skip" aside="pages">
              <Input
                id="pn-skip"
                type="number"
                min={0}
                value={skipFirst}
                onChange={(e) => setSkipFirst(e.target.value)}
                className="h-10 text-base"
              />
            </Field>
          </div>

          <Field label="Size" aside={`${size} pt`}>
            <Slider
              min={7}
              max={24}
              value={[size]}
              onValueChange={([v]) => setSize(v)}
              aria-label="Font size"
            />
          </Field>

          <Field label="Font">
            <Segmented
              label="Font"
              value={family}
              onChange={setFamily}
              options={[
                { value: 'helvetica', label: 'Sans' },
                { value: 'times', label: 'Serif' },
                { value: 'courier', label: 'Mono' },
              ]}
            />
          </Field>
        </>
      }
    />
  )
}
