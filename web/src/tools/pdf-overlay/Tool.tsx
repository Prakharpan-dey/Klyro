import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { overlayPdf, type OverlayParams } from '@/ops/pdf/geometry'
import { meta } from './meta'

export default function OverlayTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [mode, setMode] = useState<OverlayParams['mode']>('first')
  const [opacity, setOpacity] = useState(100)
  const [scale, setScale] = useState(100)

  const ready = files.files.length === 2

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Laying pages over each other')
      const out = await overlayPdf(files.list, {
        mode,
        opacity: opacity / 100,
        scale: scale / 100,
      })
      progress(1, 1, 'Done')
      return [out]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      intakeHint="First the base document, then the one to lay over it."
      runLabel="OVERLAY"
      onRun={run}
      canRun={ready}
      footnote={ready ? undefined : 'Add exactly two PDFs'}
      settings={
        <>
          <Field label="Use the overlay">
            <Segmented
              label="Overlay mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'first', label: 'First page on all' },
                { value: 'sequence', label: 'Page by page' },
              ]}
            />
          </Field>

          <Field label="Opacity" aside={`${opacity}%`}>
            <Slider
              min={10}
              max={100}
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              aria-label="Opacity"
            />
          </Field>

          <Field label="Scale" aside={`${scale}%`}>
            <Slider
              min={20}
              max={100}
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              aria-label="Scale"
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Use it to add letterhead behind a document, stamp a seal on every page, or compare two
            versions by laying one over the other at half opacity.
          </p>
        </>
      }
    />
  )
}
