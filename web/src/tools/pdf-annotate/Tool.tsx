import { useState } from 'react'
import { AnchorPicker } from '@/components/console/AnchorPicker'
import { BoxCanvas } from '@/components/console/BoxCanvas'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { parsePageList } from '@/lib/pageRange'
import { useFileJob } from '@/lib/useFileJob'
import { annotatePdf, type HighlightColour } from '@/ops/pdf/annotate'
import type { FractionBox } from '@/ops/pdf/redact'
import type { Anchor } from '@/ops/pdf/stamp'
import { meta } from './meta'

const FILLS: Record<HighlightColour, string> = {
  yellow: 'bg-[#ffeb3b]/55',
  green: 'bg-[#73e673]/55',
  pink: 'bg-[#ff8cbf]/55',
  blue: 'bg-[#80ccff]/55',
}

export default function AnnotateTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [highlights, setHighlights] = useState<FractionBox[]>([])
  const [colour, setColour] = useState<HighlightColour>('yellow')
  const [note, setNote] = useState('')
  const [noteAnchor, setNoteAnchor] = useState<Anchor>('top-right')
  const [noteSize, setNoteSize] = useState(10)
  const [page, setPage] = useState(0)
  const [notePages, setNotePages] = useState('1')
  const [previewFailed, setPreviewFailed] = useState(false)

  const file = files.list[0]
  const pageCount = files.files[0]?.meta?.pages ?? 1
  const parsed = parsePageList(notePages, pageCount)
  const ready = Boolean(file) && (highlights.length > 0 || note.trim().length > 0)

  const run = () =>
    job.run(async (progress) => [
      await annotatePdf(
        file,
        {
          highlights,
          colour,
          note: note.trim() || undefined,
          noteAnchor,
          notePages: note.trim() ? (parsed.pages ?? [page]) : [],
          noteSize,
        },
        progress,
      ),
    ])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MARK UP"
      onRun={run}
      canRun={ready && !parsed.error}
      footnote="Highlights let the words show through — nothing is covered or removed"
      workbench={
        file && !previewFailed ? (
          <BoxCanvas
            file={file}
            page={page}
            onPageChange={setPage}
            boxes={highlights}
            onBoxesChange={setHighlights}
            fill={FILLS[colour]}
            label="C · Highlights"
            hint="Drag across a line to highlight it"
            onUnavailable={() => setPreviewFailed(true)}
          />
        ) : undefined
      }
      outputLabel={file && !previewFailed ? 'D · Output' : undefined}
      settings={
        <>
          <Field label="Colour">
            <Segmented
              label="Highlight colour"
              value={colour}
              onChange={setColour}
              options={[
                { value: 'yellow', label: 'Yellow' },
                { value: 'green', label: 'Green' },
                { value: 'pink', label: 'Pink' },
                { value: 'blue', label: 'Blue' },
              ]}
            />
          </Field>

          <Field label="Note" aside="optional">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reviewed 12 March — clause 4 disputed"
              aria-label="Note text"
            />
          </Field>

          {note.trim() && (
            <>
              <Field
                label="Note pages"
                aside={parsed.error ? <span className="text-destructive">{parsed.error}</span> : ''}
              >
                <Input
                  value={notePages}
                  onChange={(e) => setNotePages(e.target.value)}
                  placeholder="1, 3-5"
                  aria-label="Pages the note goes on"
                />
              </Field>

              <Field label="Note position">
                <AnchorPicker value={noteAnchor} onChange={setNoteAnchor} />
              </Field>

              <Field label="Note size" aside={`${noteSize} pt`}>
                <Slider
                  min={7}
                  max={18}
                  value={[noteSize]}
                  onValueChange={([v]) => setNoteSize(v)}
                  aria-label="Note size"
                />
              </Field>
            </>
          )}

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Marks are drawn into the page, not attached as comments, so they survive being opened
            anywhere. The text underneath keeps working: it can still be selected, searched and
            copied.
          </p>

          {previewFailed && (
            <p className="font-sans text-[12px] leading-relaxed text-destructive">
              This PDF cannot be previewed here, so highlighting is unavailable. A note can still be
              added.
            </p>
          )}
        </>
      }
    />
  )
}
