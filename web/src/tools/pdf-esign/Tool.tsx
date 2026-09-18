import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { SignaturePad } from '@/components/console/SignaturePad'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { stampImage, type Anchor } from '@/ops/pdf/stamp'
import { meta } from './meta'

type Scope = 'last' | 'first' | 'pages'

export default function ESignTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [signature, setSignature] = useState<Blob | null>(null)
  const [anchor, setAnchor] = useState<Anchor>('bottom-right')
  const [widthMm, setWidthMm] = useState(50)
  const [scope, setScope] = useState<Scope>('last')
  const [pages, setPages] = useState('1')

  const pageCount = files.files[0]?.meta?.pages
  const parsed = scope === 'pages' && pageCount ? parsePageList(pages, pageCount) : undefined
  const ready = Boolean(signature && files.list.length && !parsed?.error)

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Placing signature')
      const png = await signature!.arrayBuffer()
      const count = pageCount ?? 1
      const target =
        scope === 'last' ? [count - 1] : scope === 'first' ? [0] : (parsed?.pages ?? [0])

      const out = await stampImage(files.list[0], {
        png,
        pages: target,
        anchor,
        widthMm,
        marginMm: 14,
        suffix: '-signed',
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
      runLabel="PLACE SIGNATURE"
      onRun={run}
      canRun={ready}
      footnote="This draws your signature onto the page. It is not a cryptographic signature."
      settings={
        <>
          <Field label="Your signature">
            <SignaturePad onChange={setSignature} />
          </Field>

          <Field label="Sign on">
            <Segmented
              label="Pages to sign"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'last', label: 'Last page' },
                { value: 'first', label: 'First page' },
                { value: 'pages', label: 'Chosen' },
              ]}
            />
          </Field>

          {scope === 'pages' && (
            <Field label="Pages" htmlFor="sig-pages">
              <Input
                id="sig-pages"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="1, 4"
                aria-invalid={Boolean(parsed?.error)}
                className="h-10 text-sm"
              />
              {parsed?.error && (
                <p className="readout text-[10px] text-destructive">{parsed.error}</p>
              )}
            </Field>
          )}

          <Field label="Position">
            <AnchorPicker value={anchor} onChange={setAnchor} />
          </Field>

          <Field label="Width" aside={`${widthMm} mm`}>
            <Slider
              min={20}
              max={100}
              value={[widthMm]}
              onValueChange={([v]) => setWidthMm(v)}
              aria-label="Signature width"
            />
          </Field>
        </>
      }
    />
  )
}
