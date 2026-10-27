import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { pdfToPptx } from '@/ops/office/toPptx'
import { meta } from './meta'

type Quality = 'small' | 'standard' | 'sharp'

const QUALITY: Record<Quality, { dpi: number; sharp: boolean }> = {
  small: { dpi: 110, sharp: false },
  standard: { dpi: 150, sharp: false },
  sharp: { dpi: 200, sharp: true },
}

export default function PdfToPptxTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [quality, setQuality] = useState<Quality>('standard')
  const [notes, setNotes] = useState(true)

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(await pdfToPptx(file, { ...QUALITY[quality], notes }, progress))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE DECK"
      onRun={run}
      cancellable
      footnote="Slides are pictures of the pages — the text sits in the speaker notes"
      settings={
        <>
          <Field label="Slide quality">
            <Segmented
              label="Slide quality"
              value={quality}
              onChange={setQuality}
              options={[
                { value: 'small', label: 'Small' },
                { value: 'standard', label: 'Standard' },
                { value: 'sharp', label: 'Sharp' },
              ]}
            />
          </Field>

          <Field label="Notes">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="pp-notes" className="label">
                Copy each page&apos;s text into its notes
              </Label>
              <Switch id="pp-notes" checked={notes} onCheckedChange={setNotes} />
            </div>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Sharp keeps small print crisp when the deck is projected, at the cost of a larger file.
            The deck takes the shape of the first page, so an A4 document becomes a portrait deck
            rather than a strip in the middle of a widescreen slide.
          </p>
        </>
      }
    />
  )
}
