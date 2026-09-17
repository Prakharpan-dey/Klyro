import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { pdfToImages, type PdfToImagesParams } from '@/ops/pdf/toImages'
import { meta } from './meta'

const dpis = ['72', '150', '200', '300'] as const

export default function PdfToImagesTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [format, setFormat] = useState<PdfToImagesParams['format']>('image/jpeg')
  const [dpi, setDpi] = useState<(typeof dpis)[number]>('150')
  const [quality, setQuality] = useState(90)

  const pages = files.files.reduce((n, f) => n + (f.meta?.pages ?? 0), 0)
  const locked = files.files.some((f) => f.meta?.encrypted)

  const run = () =>
    job.run((progress) =>
      pdfToImages(files.list, { format, dpi: Number(dpi), quality: quality / 100 }, progress),
    )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="EXPORT PAGES"
      onRun={run}
      canRun={!locked}
      footnote={pages ? `${pages} image${pages === 1 ? '' : 's'} will be created` : undefined}
      settings={
        <>
          <Field label="Format">
            <Segmented
              label="Image format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'image/jpeg', label: 'JPG' },
                { value: 'image/png', label: 'PNG' },
              ]}
            />
          </Field>

          <Field label="Resolution" aside="dpi">
            <Segmented
              label="Resolution in dpi"
              value={dpi}
              onChange={setDpi}
              options={dpis.map((d) => ({ value: d, label: d }))}
            />
          </Field>

          {format === 'image/jpeg' && (
            <Field label="Quality" aside={quality}>
              <Slider
                min={40}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          )}

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            150 dpi is fine for screens. Use 300 for printing or text you need to read closely.
          </p>
          {locked && (
            <p className="font-sans text-[12px] text-egress">
              A password-protected PDF can&apos;t be rendered.
            </p>
          )}
        </>
      }
    />
  )
}
