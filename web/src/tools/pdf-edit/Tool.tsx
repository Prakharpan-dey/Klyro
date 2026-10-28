import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowCounterClockwiseIcon,
  CircleIcon,
  ImageIcon,
  LineSegmentIcon,
  RectangleIcon,
  SquareIcon,
  TextTIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Field } from '@/components/console/Field'
import { PageEditor, type AddKind, type Geometry } from '@/components/console/PageEditor'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useFileJob } from '@/lib/useFileJob'
import { describeItem, editPdf, type EditItem } from '@/ops/pdf/edit'
import { embeddableBytes } from '@/ops/pdf/fromImages'
import type { FontFamily, PlacedBox } from '@/ops/pdf/stamp'
import { IMAGE_ACCEPT } from '../types'
import { meta } from './meta'

/** Enough to undo a slip, not so much that a long session holds every step. */
const HISTORY = 50

interface PendingImage {
  bytes: ArrayBuffer
  format: 'jpg' | 'png'
  aspect: number
  url: string
}

interface Edits {
  for?: File
  items: EditItem[]
  past: EditItem[][]
}

const ADD_BUTTONS: { kind: AddKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'text', label: 'TEXT', icon: <TextTIcon /> },
  { kind: 'image', label: 'PICTURE', icon: <ImageIcon /> },
  { kind: 'rect', label: 'BOX', icon: <RectangleIcon /> },
  { kind: 'ellipse', label: 'ELLIPSE', icon: <CircleIcon /> },
  { kind: 'line', label: 'LINE', icon: <LineSegmentIcon /> },
  { kind: 'whiteout', label: 'WHITEOUT', icon: <SquareIcon /> },
]

const newId = () => Math.random().toString(36).slice(2, 10)

const percent = (n: number) => Math.round(n * 1000) / 10

export default function EditPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const file = files.list[0]

  const [edits, setEdits] = useState<Edits>({ items: [], past: [] })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string>()
  const [adding, setAdding] = useState<AddKind>()
  const [pending, setPending] = useState<PendingImage>()
  const [images, setImages] = useState<{
    urls: Record<string, string>
    aspects: Record<string, number>
  }>({ urls: {}, aspects: {} })
  const [previewFailed, setPreviewFailed] = useState(false)
  const [imageError, setImageError] = useState<string>()
  const picker = useRef<HTMLInputElement>(null)
  const textBox = useRef<HTMLTextAreaElement>(null)

  // the edits belong to the staged file; a new file starts clean
  const current = edits.for === file ? edits : { items: [], past: [] }
  const items = current.items
  const item = items.find((one) => one.id === selected)

  // a new text box takes the cursor straight to its words, once the field exists
  const focusNext = useRef<string>(undefined)
  useEffect(() => {
    if (focusNext.current && item?.id === focusNext.current && textBox.current) {
      textBox.current.select()
      focusNext.current = undefined
    }
  })

  // text style carries over to the next text box, like a word processor
  const [style, setStyle] = useState({
    size: 12,
    font: 'helvetica' as FontFamily,
    bold: false,
    colour: '#111111',
  })
  const [pen, setPen] = useState({ stroke: '#c62828', width: 2 })

  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const change = (next: EditItem[], commit = true) =>
    setEdits((was) => {
      const base = was.for === file ? was : { items: [], past: [] }
      return {
        for: file,
        items: next,
        // a drag only becomes one undo step once it ends
        past: commit ? [...base.past, base.items].slice(-HISTORY) : base.past,
      }
    })

  const update = (patch: Partial<EditItem>) => {
    if (!item) return
    change(items.map((one) => (one.id === item.id ? ({ ...one, ...patch } as EditItem) : one)))
  }

  const undo = () =>
    setEdits((was) => {
      if (was.for !== file || !was.past.length) return was
      return { for: file, items: was.past[was.past.length - 1], past: was.past.slice(0, -1) }
    })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).closest('input, textarea, [contenteditable]')
      if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const choose = (kind: AddKind) => {
    setImageError(undefined)
    if (kind === 'image') {
      picker.current?.click()
      return
    }
    setAdding((now) => (now === kind ? undefined : kind))
  }

  const pickImage = async (picked: File | undefined) => {
    if (!picked) return
    try {
      // the same path as Images → PDF: upright, and re-encoded if PDF cannot hold it
      const { bytes, kind } = await embeddableBytes(picked)
      const blob = new Blob([bytes], { type: kind === 'png' ? 'image/png' : 'image/jpeg' })
      const bitmap = await createImageBitmap(blob)
      const aspect = bitmap.width / bitmap.height
      bitmap.close()
      const url = URL.createObjectURL(blob)
      urls.current.push(url)
      setPending({ bytes, format: kind, aspect, url })
      setAdding('image')
    } catch {
      setImageError('That picture could not be opened')
    }
  }

  const create = (kind: AddKind, geometry: Geometry) => {
    const id = newId()
    const box = 'box' in geometry ? geometry.box : undefined
    let next: EditItem | undefined

    if (kind === 'line' && 'from' in geometry) {
      next = { id, page, kind, from: geometry.from, to: geometry.to, ...pen }
    } else if (box && kind === 'text') {
      next = { id, page, kind, box, text: 'Type here', ...style }
    } else if (box && (kind === 'rect' || kind === 'ellipse')) {
      next = { id, page, kind, box, ...pen }
    } else if (box && kind === 'whiteout') {
      next = { id, page, kind, box }
    } else if (box && kind === 'image' && pending) {
      next = { id, page, kind, box, bytes: pending.bytes, format: pending.format }
      setImages((was) => ({
        urls: { ...was.urls, [id]: pending.url },
        aspects: { ...was.aspects, [id]: pending.aspect },
      }))
      setPending(undefined)
    }
    if (!next) return

    change([...items, next])
    setSelected(id)
    setAdding(undefined)
    // straight into the words, which is what anyone adding text wants next
    if (kind === 'text') focusNext.current = id
  }

  const remove = () => {
    if (!item) return
    change(items.filter((one) => one.id !== item.id))
    setSelected(undefined)
  }

  const setBox = (key: keyof PlacedBox, value: string) => {
    if (!item || item.kind === 'line') return
    const n = Number(value) / 100
    if (!Number.isFinite(n)) return
    const box = { ...item.box, [key]: n }
    box.w = Math.min(Math.max(0.005, box.w), 1)
    box.h = Math.min(Math.max(0.005, box.h), 1)
    box.x = Math.min(Math.max(0, box.x), 1 - box.w)
    box.y = Math.min(Math.max(0, box.y), 1 - box.h)
    update({ box })
  }

  const run = () => job.run(async () => [await editPdf(file, items)])

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="SAVE PDF"
      onRun={run}
      canRun={Boolean(file) && items.length > 0}
      intakeHint="One PDF at a time."
      footnote={
        items.length
          ? `${items.length} item${items.length === 1 ? '' : 's'} will be added; nothing already there changes`
          : 'Add something to the page first'
      }
      workbench={
        file && !previewFailed ? (
          <PageEditor
            file={file}
            page={page}
            onPageChange={setPage}
            items={items}
            onItemsChange={change}
            selected={selected}
            onSelect={setSelected}
            adding={adding}
            onCreate={create}
            imageUrls={images.urls}
            imageAspects={images.aspects}
            addAspect={pending?.aspect}
            onUnavailable={() => setPreviewFailed(true)}
          />
        ) : undefined
      }
      outputLabel={file && !previewFailed ? 'D · Output' : undefined}
      settings={
        <>
          <Field label="Add">
            <div className="grid grid-cols-3 gap-2">
              {ADD_BUTTONS.map((button) => (
                <Button
                  key={button.kind}
                  variant="outline"
                  aria-pressed={adding === button.kind}
                  onClick={() => choose(button.kind)}
                  disabled={!file || previewFailed}
                  className="aria-pressed:border-primary aria-pressed:text-primary"
                >
                  {button.icon}
                  {button.label}
                </Button>
              ))}
            </div>
            <input
              ref={picker}
              type="file"
              accept={IMAGE_ACCEPT.join(',')}
              className="hidden"
              onChange={(event) => {
                void pickImage(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <p role="status" className="readout text-[10px] text-faint">
              {imageError ??
                (adding
                  ? 'Now drag a box on the page, or click for the usual size'
                  : 'Pick one, then place it on the page')}
            </p>
          </Field>

          {item ? (
            <div className="flex flex-col gap-4 border-t border-line-soft pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="label">{describeItem(item)}</span>
                <Button variant="outline" onClick={remove} className="h-8 px-2.5">
                  <TrashIcon />
                  REMOVE
                </Button>
              </div>

              {item.kind === 'text' && (
                <>
                  <Field label="Words" htmlFor="edit-text">
                    <Textarea
                      id="edit-text"
                      ref={textBox}
                      value={item.text}
                      onChange={(event) => update({ text: event.target.value })}
                      rows={3}
                    />
                  </Field>
                  <Field label="Font">
                    <Segmented
                      label="Font"
                      value={item.font}
                      onChange={(font) => {
                        update({ font })
                        setStyle((s) => ({ ...s, font }))
                      }}
                      options={[
                        { value: 'helvetica', label: 'Sans' },
                        { value: 'times', label: 'Serif' },
                        { value: 'courier', label: 'Mono' },
                      ]}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Size (pt)" htmlFor="edit-size">
                      <Input
                        id="edit-size"
                        type="number"
                        min={4}
                        max={144}
                        value={item.size}
                        onChange={(event) => {
                          const size = Math.min(144, Math.max(4, Number(event.target.value) || 12))
                          update({ size })
                          setStyle((s) => ({ ...s, size }))
                        }}
                      />
                    </Field>
                    <Field label="Colour" htmlFor="edit-colour">
                      <Input
                        id="edit-colour"
                        type="color"
                        value={item.colour}
                        onChange={(event) => {
                          update({ colour: event.target.value })
                          setStyle((s) => ({ ...s, colour: event.target.value }))
                        }}
                        className="h-8 p-0.5"
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="edit-bold" className="label">
                      Bold
                    </Label>
                    <Switch
                      id="edit-bold"
                      checked={item.bold}
                      onCheckedChange={(bold) => {
                        update({ bold })
                        setStyle((s) => ({ ...s, bold }))
                      }}
                    />
                  </div>
                </>
              )}

              {(item.kind === 'rect' || item.kind === 'ellipse' || item.kind === 'line') && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Colour" htmlFor="edit-stroke">
                    <Input
                      id="edit-stroke"
                      type="color"
                      value={item.stroke}
                      onChange={(event) => {
                        update({ stroke: event.target.value })
                        setPen((p) => ({ ...p, stroke: event.target.value }))
                      }}
                      className="h-8 p-0.5"
                    />
                  </Field>
                  <Field label="Thickness (pt)" htmlFor="edit-width">
                    <Input
                      id="edit-width"
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={item.width}
                      onChange={(event) => {
                        const width = Math.min(20, Math.max(0.5, Number(event.target.value) || 1))
                        update({ width })
                        setPen((p) => ({ ...p, width }))
                      }}
                    />
                  </Field>
                </div>
              )}

              {(item.kind === 'rect' || item.kind === 'ellipse') && (
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="edit-fill" className="label">
                    Filled
                  </Label>
                  <div className="flex items-center gap-2">
                    {item.fill && (
                      <Input
                        type="color"
                        aria-label="Fill colour"
                        value={item.fill}
                        onChange={(event) => update({ fill: event.target.value })}
                        className="h-8 w-12 p-0.5"
                      />
                    )}
                    <Switch
                      id="edit-fill"
                      checked={Boolean(item.fill)}
                      onCheckedChange={(on) => update({ fill: on ? '#fff3b0' : undefined })}
                    />
                  </div>
                </div>
              )}

              {item.kind !== 'line' && (
                <Field label="Position and size, % of the page">
                  <div className="grid grid-cols-4 gap-2">
                    {(['x', 'y', 'w', 'h'] as const).map((key) => (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="readout text-[10px] text-faint">{key.toUpperCase()}</span>
                        <Input
                          type="number"
                          step={0.5}
                          value={percent(item.box[key])}
                          onChange={(event) => setBox(key, event.target.value)}
                          aria-label={`${{ x: 'Left', y: 'Top', w: 'Width', h: 'Height' }[key]} in percent`}
                        />
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              {item.kind === 'line' && (
                <p className="readout text-[10px] text-faint">
                  From {percent(item.from.x)}%, {percent(item.from.y)}% to {percent(item.to.x)}%,{' '}
                  {percent(item.to.y)}% · drag either end to change it
                </p>
              )}

              {item.kind === 'whiteout' && (
                <p className="font-sans text-[12px] leading-relaxed text-egress">
                  Whiteout hides what is under it on the page, but the words are still in the file
                  and can be copied out. To take them out for good, use{' '}
                  <Link to="/tools/pdf-redact" className="underline">
                    Redact
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            items.length > 0 && (
              <p className="readout text-[10px] text-faint">
                Click an item on the page, or Tab to it, to change it
              </p>
            )
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={undo}
              disabled={!current.past.length}
              className="h-8 px-2.5"
            >
              <ArrowCounterClockwiseIcon />
              UNDO
            </Button>
            <span className="readout text-[10px] text-faint">or Ctrl+Z</span>
          </div>

          <p className="font-sans text-[12px] leading-relaxed text-faint">
            This adds to a PDF; it does not change the words already in it. To fix a typo, cover it
            with whiteout and type the right word on top. Text uses the standard PDF fonts, which
            only cover Latin script.
          </p>

          {previewFailed && (
            <p className="font-sans text-[12px] leading-relaxed text-destructive">
              This PDF cannot be shown here, so there is nothing to place items on.
            </p>
          )}
        </>
      }
    />
  )
}
