import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import type { ImageFormat } from '@/lib/imageMath'
import { useFileJob } from '@/lib/useFileJob'
import { convertImages } from '@/ops/image/convert'
import { meta } from './meta'

export default function HeicToJpgTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [format, setFormat] = useState<ImageFormat>('image/jpeg')
  const [quality, setQuality] = useState(90)

  const run = () =>
    job.run((progress) => convertImages(files.list, { format, quality: quality / 100 }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      // HEIC packs a photo about twice as tightly as JPG, so the copy is always
      // larger; showing that as "+80%" reads like something went wrong
      compareSizes={false}
      runLabel="CONVERT"
      onRun={run}
      footnote="Location and camera details are left out of the converted photos"
      settings={
        <>
          <Field label="Convert to">
            <Segmented
              label="Target format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'image/jpeg', label: 'JPG' },
                { value: 'image/png', label: 'PNG' },
              ]}
            />
          </Field>

          {format === 'image/jpeg' ? (
            <Field label="Quality" aside={quality}>
              <Slider
                min={50}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          ) : (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              PNG keeps every pixel exactly, and makes a photo several times larger than JPG.
            </p>
          )}

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Safari reads HEIC itself. Other browsers load a decoder the first time you convert one,
            about 2 MB, served from this site rather than a third party.
          </p>
        </>
      }
    />
  )
}
