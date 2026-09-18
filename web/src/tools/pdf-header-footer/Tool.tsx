import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { fillTemplate, stampText, type Anchor, type FontFamily } from '@/ops/pdf/stamp'
import type { OutputFile } from '@/ops/types'
import { meta } from './meta'

type Align = 'left' | 'center' | 'right'

export default function HeaderFooterTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('{date}')
  const [align, setAlign] = useState<Align>('center')
  const [size, setSize] = useState(10)
  const [marginMm, setMarginMm] = useState(12)
  const [family, setFamily] = useState<FontFamily>('helvetica')

  const hasText = Boolean(header.trim() || footer.trim())

  const run = () =>
    job.run(async (progress) => {
      const out: OutputFile[] = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        let current = file
        let result: OutputFile | undefined

        for (const [template, edge] of [
          [header, 'top'],
          [footer, 'bottom'],
        ] as const) {
          if (!template.trim()) continue
          result = await stampText(current, {
            textFor: (index, count) => fillTemplate(template, index + 1, count),
            anchor: `${edge}-${align}` as Anchor,
            family,
            size,
            marginMm,
            suffix: '-stamped',
          })
          current = result.file
        }

        if (result) out.push({ ...result, sourceName: file.name, sourceSize: file.size })
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
      runLabel="ADD TEXT"
      onRun={run}
      canRun={hasText}
      footnote="Use {n} for the page number, {total} for the page count and {date} for today"
      settings={
        <>
          <Field label="Header" htmlFor="hf-header">
            <Input
              id="hf-header"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Semester 4 marksheet"
              maxLength={120}
              className="h-10 text-sm"
            />
          </Field>

          <Field label="Footer" htmlFor="hf-footer">
            <Input
              id="hf-footer"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="{date} · page {n} of {total}"
              maxLength={120}
              className="h-10 text-sm"
            />
          </Field>

          <Field label="Align">
            <Segmented
              label="Alignment"
              value={align}
              onChange={setAlign}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Centre' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size" aside={`${size} pt`}>
              <Slider
                min={7}
                max={18}
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                aria-label="Font size"
              />
            </Field>
            <Field label="Margin" aside={`${marginMm} mm`}>
              <Slider
                min={5}
                max={30}
                value={[marginMm]}
                onValueChange={([v]) => setMarginMm(v)}
                aria-label="Margin"
              />
            </Field>
          </div>

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
