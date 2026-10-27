import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { imagesToPptx, type DeckShape } from '@/ops/office/toPptx'
import { meta } from './meta'

export default function ImagesToPptxTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [shape, setShape] = useState<DeckShape>('16:9')
  const [namesInNotes, setNamesInNotes] = useState(false)
  const [name, setName] = useState('slides')

  const run = () =>
    job.run(async (progress) => [
      await imagesToPptx(
        files.list,
        { shape, namesInNotes, name: name.trim().replace(/\.pptx$/i, '') || 'slides' },
        progress,
      ),
    ])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="One image per slide, in this order. Drag the numbers to change it."
      runLabel="MAKE DECK"
      onRun={run}
      cancellable
      footnote={
        files.files.length
          ? `${files.files.length} slide${files.files.length === 1 ? '' : 's'}`
          : undefined
      }
      settings={
        <>
          <Field label="Slide shape">
            <Segmented
              label="Slide shape"
              value={shape}
              onChange={setShape}
              options={[
                { value: '16:9', label: '16:9' },
                { value: '4:3', label: '4:3' },
                { value: 'first', label: 'First image' },
              ]}
            />
          </Field>

          <Field label="File name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Presentation file name"
            />
          </Field>

          <Field label="Notes">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ip-notes" className="label">
                Put each file name in its notes
              </Label>
              <Switch id="ip-notes" checked={namesInNotes} onCheckedChange={setNamesInNotes} />
            </div>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Each picture is fitted to its slide without stretching, so a portrait photo on a
            widescreen slide gets space either side. Phone photos are turned the right way up.
          </p>
        </>
      }
    />
  )
}
