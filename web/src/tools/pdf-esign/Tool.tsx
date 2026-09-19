import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { Field } from '@/components/console/Field'
import { PagePlacer } from '@/components/console/PagePlacer'
import { Segmented } from '@/components/console/Segmented'
import { SignatureSource, type SignatureImage } from '@/components/console/SignatureSource'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { stampImage, stampImageAt, type Anchor, type PlacedBox } from '@/ops/pdf/stamp'
import { meta } from './meta'

type Scope = 'this' | 'last' | 'first' | 'all' | 'pages'

/** Bottom right, about a third of the width — where a signature usually goes. */
const START: PlacedBox = { x: 0.6, y: 0.78, w: 0.28, h: 0.09 }

export default function ESignTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [signature, setSignature] = useState<SignatureImage | null>(null)
  const [box, setBox] = useState<PlacedBox>(START)
  const [page, setPage] = useState(0)
  const [scope, setScope] = useState<Scope>('this')
  const [pages, setPages] = useState('1')
  const [placerFailed, setPlacerFailed] = useState(false)

  // the fallback, for a file the previewer cannot draw
  const [anchor, setAnchor] = useState<Anchor>('bottom-right')
  const [widthMm, setWidthMm] = useState(50)

  const file = files.list[0]
  const pageCount = files.files[0]?.meta?.pages ?? 1
  const parsed = scope === 'pages' ? parsePageList(pages, pageCount) : undefined
  const ready = Boolean(signature && file && !parsed?.error)

  const targetPages = () => {
    if (scope === 'this') return [page]
    if (scope === 'first') return [0]
    if (scope === 'last') return [pageCount - 1]
    if (scope === 'all') return Array.from({ length: pageCount }, (_, i) => i)
    return parsed?.pages ?? [page]
  }

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Placing signature')
      const png = await signature!.blob.arrayBuffer()
      const target = targetPages()

      const out = placerFailed
        ? await stampImage(file, {
            png,
            pages: target,
            anchor,
            widthMm,
            marginMm: 14,
            suffix: '-signed',
          })
        : // the same spot on every chosen page, so a mixed-size document still
          // gets the signature where the reader expects it
          await stampImageAt(file, {
            png,
            boxes: Object.fromEntries(target.map((index) => [index, box])),
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
      workbench={
        file && !placerFailed ? (
          <PagePlacer
            file={file}
            page={page}
            onPageChange={setPage}
            box={box}
            onBoxChange={setBox}
            src={signature?.url}
            aspect={signature?.aspect ?? 3}
            onUnavailable={() => setPlacerFailed(true)}
          />
        ) : undefined
      }
      runLabel="PLACE SIGNATURE"
      onRun={run}
      canRun={ready}
      footnote="This draws your signature onto the page. It is not a cryptographic signature."
      settings={
        <>
          <Field label="Your signature">
            <SignatureSource onChange={setSignature} />
          </Field>

          <Field label="Sign on">
            <Segmented
              label="Pages to sign"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'this', label: 'This page' },
                { value: 'all', label: 'Every page' },
                { value: 'last', label: 'Last' },
                { value: 'pages', label: 'Chosen' },
              ]}
            />
            {scope !== 'pages' && (
              <p className="readout text-[10px] text-faint">
                {scope === 'this'
                  ? `Page ${page + 1}, where you placed it`
                  : scope === 'all'
                    ? `All ${pageCount} pages, in the same spot`
                    : `Page ${pageCount}`}
              </p>
            )}
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

          {placerFailed ? (
            <>
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
              <p className="readout text-[10px] text-egress">
                This file could not be previewed, so place it by corner instead
              </p>
            </>
          ) : (
            <p className="font-sans text-[12.5px] leading-relaxed text-soft">
              Drag the signature on the page opposite, and pull its corner to resize. It lands
              exactly where you leave it, upright even on a page that was rotated.
            </p>
          )}
        </>
      }
    />
  )
}
