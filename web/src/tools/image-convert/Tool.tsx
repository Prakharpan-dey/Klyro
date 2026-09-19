import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useImageFormats } from '@/components/tool/useImageFormats'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import type { ImageFormat } from '@/lib/imageMath'
import { useFileJob } from '@/lib/useFileJob'
import { convertImages } from '@/ops/image/convert'
import { meta } from './meta'

const candidates: ImageFormat[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export default function ConvertTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [format, setFormat] = useState<ImageFormat>('image/webp')
  const [quality, setQuality] = useState(88)
  const formats = useImageFormats(candidates)

  const run = () =>
    job.run((progress) => convertImages(files.list, { format, quality: quality / 100 }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="CONVERT"
      onRun={run}
      footnote="EXIF and GPS data are removed from the output"
      settings={
        <>
          <Field label="Convert to">
            <Segmented
              label="Target format"
              value={format}
              onChange={setFormat}
              options={formats.options}
            />
            {formats.missing.length > 0 && (
              <p className="readout text-[10px] text-faint">
                {formats.missing.join(', ')} not available in this browser
              </p>
            )}
          </Field>

          {format === 'image/png' ? (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              PNG is lossless, so there is no quality setting. Photos usually get bigger as PNG.
            </p>
          ) : (
            <Field label="Quality" aside={quality}>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                aria-label="Quality"
              />
            </Field>
          )}

          {format === 'image/jpeg' && (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              JPG has no transparency — transparent areas become white.
            </p>
          )}

          {format === 'image/avif' && (
            <p className="font-sans text-[12px] leading-relaxed text-faint">
              AVIF makes the smallest files of the four, and takes the longest to write. Older
              phones and some apps still cannot open it.
            </p>
          )}
        </>
      }
    />
  )
}
