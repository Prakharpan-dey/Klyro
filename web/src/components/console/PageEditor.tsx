import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Panel } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import {
  describeItem,
  itemBox,
  KIND_NAMES,
  LINE_HEIGHT,
  moveItem,
  type EditItem,
  type Point,
} from '@/ops/pdf/edit'
import { closePdf, openPdf, renderPage } from '@/ops/pdf/pdfjs'
import type { PlacedBox } from '@/ops/pdf/stamp'

/**
 * A page you can put things on: text, pictures, shapes, whiteout.
 *
 * Everything is in fractions of the page as the reader sees it, the model the
 * other placement tools use, so the preview can be any width. Text is drawn at
 * its real size by converting points to the preview's pixels, which keeps what
 * you see close to what the PDF will hold.
 *
 * Pointer: pick a kind and drag out its box, or click for a default size. Drag
 * an item to move it, its corner to resize. Keyboard: Tab to an item, arrows to
 * nudge (Shift for bigger steps), Delete to remove; position and size can also
 * be typed in the settings.
 */

export type AddKind = EditItem['kind']

export type Geometry = { box: PlacedBox } | { from: Point; to: Point }

interface PageEditorProps {
  file: File
  page: number
  onPageChange: (page: number) => void
  items: EditItem[]
  /** called with every change; `commit` is false while a drag is still going */
  onItemsChange: (items: EditItem[], commit: boolean) => void
  selected?: string
  onSelect: (id: string | undefined) => void
  /** the kind the next drag on the page creates, or undefined to select */
  adding?: AddKind
  onCreate: (kind: AddKind, geometry: Geometry) => void
  /** object URLs for image items, by id */
  imageUrls: Record<string, string>
  /** width over height for image items, so a resize keeps their shape */
  imageAspects: Record<string, number>
  /** width over height of the picture about to be placed */
  addAspect?: number
  onUnavailable?: () => void
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** A drag shorter than this is a click, which places a default-sized item. */
const CLICK = 0.01
const MIN_SIDE = 0.01

const DEFAULT_SIZE: Record<AddKind, { w: number; h: number }> = {
  text: { w: 0.4, h: 0.05 },
  image: { w: 0.3, h: 0.2 },
  rect: { w: 0.25, h: 0.12 },
  ellipse: { w: 0.2, h: 0.12 },
  line: { w: 0.3, h: 0 },
  whiteout: { w: 0.3, h: 0.04 },
}

const FAMILIES = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
}

export function PageEditor({
  file,
  page,
  onPageChange,
  items,
  onItemsChange,
  selected,
  onSelect,
  adding,
  onCreate,
  imageUrls,
  imageAspects,
  addAspect,
  onUnavailable,
}: PageEditorProps) {
  const holder = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const doc = useRef<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState(0)
  const [ratio, setRatio] = useState(1)
  // the page width in points as seen, to show text at its true size
  const [pageWidthPt, setPageWidthPt] = useState(595)
  const [overlayWidth, setOverlayWidth] = useState(560)
  const [draft, setDraft] = useState<{ kind: AddKind; from: Point; to: Point } | null>(null)
  const [error, setError] = useState<string>()
  const hintId = useId()

  // held in a ref: callers pass a fresh arrow each render, and reopening the
  // document on every edit would race the page render
  const unavailable = useRef(onUnavailable)
  useEffect(() => {
    unavailable.current = onUnavailable
  })

  useEffect(() => {
    let closed = false
    openPdf(file)
      .then((opened) => {
        if (closed) return void closePdf(opened)
        doc.current = opened
        setError(undefined)
        setPages(opened.numPages)
      })
      .catch(() => {
        if (closed) return
        setError('This PDF cannot be shown here')
        unavailable.current?.()
      })
    return () => {
      closed = true
      const open = doc.current
      doc.current = null
      if (open) void closePdf(open)
    }
  }, [file])

  useEffect(() => {
    if (!pages) return
    let live = true
    const draw = async () => {
      const open = doc.current
      const target = holder.current
      if (!open || !target) return
      try {
        const width = Math.min(target.clientWidth || 560, 760)
        const first = await open.getPage(page + 1)
        const base = first.getViewport({ scale: 1 })
        first.cleanup()
        const canvas = await renderPage(
          open,
          page,
          (width * (window.devicePixelRatio || 1)) / base.width,
        )
        if (!live) return
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        setRatio(base.width / base.height)
        setPageWidthPt(base.width)
        target.replaceChildren(canvas)
      } catch {
        if (live) setError('This page could not be drawn')
      }
    }
    void draw()
    return () => {
      live = false
    }
  }, [pages, page])

  useEffect(() => {
    const node = overlay.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setOverlayWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const pxPerPt = overlayWidth / pageWidthPt

  const at = (e: { clientX: number; clientY: number }): Point => {
    const rect = overlay.current!.getBoundingClientRect()
    return {
      x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    }
  }

  /** Runs a pointer gesture to its end, on the element that started it. */
  const follow = (
    event: ReactPointerEvent,
    onMove: (point: Point, e: PointerEvent) => void,
    onEnd: () => void,
  ) => {
    event.preventDefault()
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)
    const move = (e: PointerEvent) => onMove(at(e), e)
    const stop = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', stop)
      node.removeEventListener('pointercancel', stop)
      onEnd()
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', stop)
    node.addEventListener('pointercancel', stop)
  }

  const replace = (next: EditItem, commit: boolean) =>
    onItemsChange(
      items.map((item) => (item.id === next.id ? next : item)),
      commit,
    )

  const startOnPage = (event: ReactPointerEvent) => {
    if (event.button !== 0) return
    if (!adding) {
      onSelect(undefined)
      return
    }
    const kind = adding
    const from = at(event)
    let to = from
    setDraft({ kind, from, to })
    follow(
      event,
      (point) => {
        to = point
        setDraft({ kind, from, to })
      },
      () => {
        setDraft(null)
        const dragged = Math.hypot(to.x - from.x, to.y - from.y) > CLICK
        if (kind === 'line') {
          const end = dragged ? to : { x: clamp(from.x + DEFAULT_SIZE.line.w, 0, 1), y: from.y }
          onCreate(kind, { from, to: end })
          return
        }
        const size = { ...DEFAULT_SIZE[kind] }
        if (kind === 'image' && addAspect) {
          // a picture keeps its own shape, measured against the page's
          const rect = overlay.current!.getBoundingClientRect()
          size.h = Math.min(0.9, (size.w * rect.width) / addAspect / rect.height)
        }
        const box = dragged
          ? {
              x: Math.min(from.x, to.x),
              y: Math.min(from.y, to.y),
              w: Math.max(MIN_SIDE, Math.abs(to.x - from.x)),
              h: Math.max(MIN_SIDE, Math.abs(to.y - from.y)),
            }
          : {
              x: clamp(from.x, 0, 1 - size.w),
              y: clamp(from.y, 0, 1 - size.h),
              ...size,
            }
        onCreate(kind, { box })
      },
    )
  }

  const startMove = (event: ReactPointerEvent, item: EditItem) => {
    if (event.button !== 0) return
    event.stopPropagation()
    onSelect(item.id)
    const start = at(event)
    let latest = item
    follow(
      event,
      (point) => {
        latest = moveItem(item, point.x - start.x, point.y - start.y)
        replace(latest, false)
      },
      () => replace(latest, true),
    )
  }

  const startResize = (event: ReactPointerEvent, item: EditItem) => {
    event.stopPropagation()
    if (item.kind === 'line') return
    let latest = item
    const aspect = item.kind === 'image' ? imageAspects[item.id] : undefined
    follow(
      event,
      (point) => {
        const rect = overlay.current!.getBoundingClientRect()
        const w = clamp(point.x - item.box.x, MIN_SIDE, 1 - item.box.x)
        const free = clamp(point.y - item.box.y, MIN_SIDE, 1 - item.box.y)
        // a picture keeps its own shape, measured against the page's
        const h = aspect ? Math.min((w * rect.width) / aspect / rect.height, 1 - item.box.y) : free
        latest = { ...item, box: { ...item.box, w, h } }
        replace(latest, false)
      },
      () => replace(latest, true),
    )
  }

  const startEnd = (event: ReactPointerEvent, item: EditItem, end: 'from' | 'to') => {
    event.stopPropagation()
    if (item.kind !== 'line') return
    let latest = item
    follow(
      event,
      (point) => {
        latest = { ...item, [end]: point }
        replace(latest, false)
      },
      () => replace(latest, true),
    )
  }

  const onItemKey = (event: React.KeyboardEvent, item: EditItem) => {
    const step = event.shiftKey ? 0.05 : 0.005
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      replace(moveItem(item, move[0], move[1]), true)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onItemsChange(
        items.filter((other) => other.id !== item.id),
        true,
      )
      onSelect(undefined)
    } else if (event.key === 'Escape') {
      onSelect(undefined)
    }
  }

  const boxStyle = (box: PlacedBox): CSSProperties => ({
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  })

  const onThisPage = items.filter((item) => item.page === page)

  const look = (item: EditItem): CSSProperties => {
    switch (item.kind) {
      case 'text':
        return {
          fontFamily: FAMILIES[item.font],
          fontWeight: item.bold ? 700 : 400,
          fontSize: item.size * pxPerPt,
          lineHeight: LINE_HEIGHT,
          color: item.colour,
        }
      case 'rect':
      case 'ellipse':
        return {
          border: `${Math.max(1, item.width * pxPerPt)}px solid ${item.stroke}`,
          background: item.fill ?? 'transparent',
          borderRadius: item.kind === 'ellipse' ? '50%' : 0,
        }
      case 'whiteout':
        return { background: '#ffffff' }
      default:
        return {}
    }
  }

  return (
    <Panel
      label="C · Page"
      tone="deep"
      meta={
        error ? (
          <span className="text-destructive">{error}</span>
        ) : pages ? (
          <span className="text-dim">
            Page {page + 1} of {pages}
          </span>
        ) : (
          <span className="text-dim">Opening…</span>
        )
      }
    >
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Previous page"
          className="size-8 p-0"
        >
          <CaretLeftIcon />
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
          aria-label="Next page"
          className="size-8 p-0"
        >
          <CaretRightIcon />
        </Button>
        <span className="readout text-[10px] text-faint">
          {onThisPage.length} on this page · {items.length} in all
        </span>
        <span id={hintId} className="ml-auto readout text-[10px] text-faint">
          {adding
            ? `Drag or click to place the ${KIND_NAMES[adding].toLowerCase()}`
            : 'Drag to move · corner to resize · arrows to nudge · Delete removes'}
        </span>
      </div>

      <div className="mt-3 flex justify-center border border-line-soft bg-raised p-4">
        <div className="relative w-full max-w-[760px]" style={{ aspectRatio: ratio || 0.7071 }}>
          <div ref={holder} className="absolute inset-0" />
          <div
            ref={overlay}
            onPointerDown={startOnPage}
            aria-describedby={hintId}
            className={`absolute inset-0 touch-none ${adding ? 'cursor-crosshair' : ''}`}
          >
            {onThisPage.map((item) => {
              const isSelected = item.id === selected
              const ring = isSelected
                ? 'outline outline-2 outline-primary'
                : 'outline outline-1 outline-transparent hover:outline-primary/50'

              if (item.kind === 'line') {
                const box = itemBox(item)
                return (
                  <div key={item.id}>
                    <svg
                      className="pointer-events-none absolute inset-0 size-full overflow-visible"
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <line
                        x1={item.from.x}
                        y1={item.from.y}
                        x2={item.to.x}
                        y2={item.to.y}
                        stroke={item.stroke}
                        strokeWidth={Math.max(1, item.width * pxPerPt)}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {/* a hit area around the line, which is too thin to grab */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={describeItem(item)}
                      aria-pressed={isSelected}
                      onPointerDown={(e) => startMove(e, item)}
                      onFocus={() => onSelect(item.id)}
                      onKeyDown={(e) => onItemKey(e, item)}
                      className={`absolute cursor-move ${ring}`}
                      style={{
                        left: `calc(${box.x * 100}% - 6px)`,
                        top: `calc(${box.y * 100}% - 6px)`,
                        width: `calc(${box.w * 100}% + 12px)`,
                        height: `calc(${box.h * 100}% + 12px)`,
                      }}
                    />
                    {isSelected &&
                      (['from', 'to'] as const).map((end) => (
                        <span
                          key={end}
                          onPointerDown={(e) => startEnd(e, item, end)}
                          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-crosshair border border-primary bg-primary"
                          style={{ left: `${item[end].x * 100}%`, top: `${item[end].y * 100}%` }}
                          aria-hidden
                        />
                      ))}
                  </div>
                )
              }

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={describeItem(item)}
                  aria-pressed={isSelected}
                  onPointerDown={(e) => startMove(e, item)}
                  onFocus={() => onSelect(item.id)}
                  onKeyDown={(e) => onItemKey(e, item)}
                  className={`absolute cursor-move select-none ${ring} ${
                    item.kind === 'whiteout' ? 'shadow-[0_0_0_1px_rgb(0_0_0/0.12)]' : ''
                  }`}
                  style={{ ...boxStyle(item.box), ...look(item) }}
                >
                  {item.kind === 'text' && (
                    <span className="pointer-events-none block break-words whitespace-pre-wrap">
                      {item.text || ' '}
                    </span>
                  )}
                  {item.kind === 'image' && imageUrls[item.id] && (
                    <img
                      src={imageUrls[item.id]}
                      alt=""
                      className="pointer-events-none size-full object-fill"
                    />
                  )}
                  {isSelected && (
                    <span
                      onPointerDown={(e) => startResize(e, item)}
                      className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize border border-primary bg-primary"
                      aria-hidden
                    />
                  )}
                </div>
              )
            })}

            {draft &&
              (draft.kind === 'line' ? (
                <svg
                  className="pointer-events-none absolute inset-0 size-full"
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <line
                    x1={draft.from.x}
                    y1={draft.from.y}
                    x2={draft.to.x}
                    y2={draft.to.y}
                    className="stroke-primary"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : (
                <div
                  className="pointer-events-none absolute border border-dashed border-primary bg-primary/10"
                  style={boxStyle({
                    x: Math.min(draft.from.x, draft.to.x),
                    y: Math.min(draft.from.y, draft.to.y),
                    w: Math.abs(draft.to.x - draft.from.x),
                    h: Math.abs(draft.to.y - draft.from.y),
                  })}
                  aria-hidden
                />
              ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
