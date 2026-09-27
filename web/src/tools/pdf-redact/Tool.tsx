import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { BoxCanvas } from '@/components/console/BoxCanvas'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { loadPdf } from '@/ops/pdf/load'
import { fractionToBox, redactPdf, type FractionBox } from '@/ops/pdf/redact'
import { meta } from './meta'

export default function RedactTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [boxes, setBoxes] = useState<FractionBox[]>([])
  const [terms, setTerms] = useState('')
  const [page, setPage] = useState(0)
  const [dpi, setDpi] = useState(150)
  const [previewFailed, setPreviewFailed] = useState(false)

  const file = files.list[0]
  const termList = terms
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const ready = Boolean(file) && (boxes.length > 0 || termList.length > 0)

  const run = () =>
    job.run(async (progress) => {
      // the preview works in fractions of a page; the op works in points, and
      // the page sizes it needs are only known once the document is open
      const doc = await loadPdf(file)
      const drawn = boxes.map((box) => fractionToBox(box, doc.getPage(box.page).getSize()))

      return [await redactPdf(file, { boxes: drawn, terms: termList, dpi }, progress)]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="REDACT"
      onRun={run}
      canRun={ready}
      cancellable
      footnote="Redacted pages are rebuilt as images, so the covered text leaves the file"
      workbench={
        file && !previewFailed ? (
          <BoxCanvas
            file={file}
            page={page}
            onPageChange={setPage}
            boxes={boxes}
            onBoxesChange={setBoxes}
            onUnavailable={() => setPreviewFailed(true)}
          />
        ) : undefined
      }
      outputLabel={file && !previewFailed ? 'D · Output' : undefined}
      settings={
        <>
          <Field label="Find and cover" aside={termList.length ? `${termList.length} terms` : ''}>
            <Input
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Priya Sharma, 4111 1111"
              aria-label="Terms to redact, separated by commas"
            />
          </Field>

          <Field label="Rebuild quality">
            <Segmented
              label="Rebuild quality"
              value={String(dpi)}
              onChange={(v) => setDpi(Number(v))}
              options={[
                { value: '110', label: 'Screen' },
                { value: '150', label: 'Normal' },
                { value: '220', label: 'Print' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Only the pages you touch are rebuilt. Everywhere else keeps its selectable text and its
            original size. Search matches are case-insensitive, and separating terms with commas
            covers each of them.
          </p>

          {previewFailed && (
            <p className="font-sans text-[12px] leading-relaxed text-destructive">
              This PDF cannot be previewed here, so drawing is unavailable. Searching for a term
              still works.
            </p>
          )}
        </>
      }
    />
  )
}
