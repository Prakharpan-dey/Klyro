import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { useFileJob } from '@/lib/useFileJob'
import { textToPdf, type TextToPdfParams } from '@/ops/pdf/textToPdf'
import type { FontFamily } from '@/ops/pdf/stamp'
import { meta } from './meta'

export default function TextToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [text, setText] = useState('')
  const [pageSize, setPageSize] = useState<TextToPdfParams['pageSize']>('a4')
  const [family, setFamily] = useState<FontFamily>('helvetica')
  const [size, setSize] = useState(11)
  const [marginMm, setMarginMm] = useState(20)
  const [name, setName] = useState('text')
  const file = files.list[0]

  // a dropped .txt file fills the box
  useEffect(() => {
    if (!file) return
    let cancelled = false
    file.text().then((content) => {
      if (cancelled) return
      setText(content)
      setName(file.name.replace(/\.[^.]+$/, ''))
    })
    return () => {
      cancelled = true
    }
  }, [file])

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Laying out text')
      const out = await textToPdf({ text, pageSize, family, size, marginMm, name })
      progress(1, 1, 'Done')
      return [out]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      intakeHint="Drop a .txt file, or just type below. Files are optional here."
      runLabel="MAKE PDF"
      onRun={run}
      canRun={Boolean(text.trim())}
      footnote={text ? `${text.length} characters` : 'Type or drop some text first'}
      settings={
        <>
          <Field label="Text" htmlFor="ttp-text">
            <Textarea
              id="ttp-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste or type here…"
              className="min-h-32 text-sm"
            />
          </Field>

          <Field label="Page size">
            <Segmented
              label="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size" aside={`${size} pt`}>
              <Slider
                min={8}
                max={18}
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                aria-label="Font size"
              />
            </Field>
            <Field label="Margin" aside={`${marginMm} mm`}>
              <Slider
                min={8}
                max={40}
                value={[marginMm]}
                onValueChange={([v]) => setMarginMm(v)}
                aria-label="Margin"
              />
            </Field>
          </div>

          <Field label="Output name" htmlFor="ttp-name" aside=".pdf">
            <Input
              id="ttp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
        </>
      }
    />
  )
}
