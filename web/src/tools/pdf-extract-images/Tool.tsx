import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { extractImages } from '@/ops/pdf/extractImages'
import { meta } from './meta'

export default function ExtractImagesTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [minSide, setMinSide] = useState('64')

  const locked = files.files.some((f) => f.meta?.encrypted)

  const run = () =>
    job.run((progress) => extractImages(files.list, { minSide: Number(minSide) }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="EXTRACT"
      onRun={run}
      canRun={!locked}
      footnote={locked ? 'Unlock it with Decrypt first' : 'JPEG photos come out exactly as stored'}
      settings={
        <>
          <Field label="Skip images smaller than">
            <Segmented
              label="Minimum size"
              value={minSide}
              onChange={setMinSide}
              options={[
                { value: '1', label: 'Keep all' },
                { value: '24', label: '24 px' },
                { value: '64', label: '64 px' },
                { value: '200', label: '200 px' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              Small images are mostly bullets, lines and icons
            </p>
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Each image comes out at the size it was put into the PDF, which is often bigger than it
            looks on the page. To save whole pages as pictures instead, use PDF → Images.
          </p>
        </>
      }
    />
  )
}
