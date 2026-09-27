import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CaretLeftIcon, CaretRightIcon, TrashIcon } from '@phosphor-icons/react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Panel } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import { closePdf, openPdf, renderPage } from '@/ops/pdf/pdfjs'
import type { FractionBox } from '@/ops/pdf/redact'

/**
 * Draws boxes over a page: the areas to remove, or the passages to highlight.
 *
 * Positions are fractions of the page, never pixels: the preview is whatever
 * width the panel happens to be, and the same fraction has to mean the same
 * place on a page rendered at any size. The conversion into PDF coordinates
 * lives in `fractionToBox`, where it can be tested without a browser.
 *
 * Drawing is a pointer interaction and there is no honest keyboard equivalent
 * for "cover this part of a scan", so the search field beside it is the
 * keyboard path to the same outcome, and the hint says so.
 */

interface BoxCanvasProps {
  file: File
  page: number
  onPageChange: (page: number) => void
  boxes: FractionBox[]
  onBoxesChange: (boxes: FractionBox[]) => void
  /** boxes the term search found, drawn but not editable */
  matched?: FractionBox[]
  /** what the boxes will become: solid black, or a translucent highlight */
  fill?: string
  label?: string
  hint?: string
  onUnavailable?: () => void
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** Ignore a stray click that drew nothing. */
const MIN_SIDE = 0.005

export function BoxCanvas({
  file,
  page,
  onPageChange,
  boxes,
  onBoxesChange,
  matched = [],
  fill = 'bg-foreground/85',
  label = 'C · Areas to remove',
  hint = 'Drag across anything to cover · or use the search field',
  onUnavailable,
}: BoxCanvasProps) {
  const holder = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const doc = useRef<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState(0)
  const [ratio, setRatio] = useState(1)
  const [drawing, setDrawing] = useState<FractionBox | null>(null)
  const [error, setError] = useState<string>()
  const hintId = useId()

  // one document, held open for the life of the panel
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
        onUnavailable?.()
      })

    return () => {
      closed = true
      const open = doc.current
      doc.current = null
      if (open) void closePdf(open)
    }
  }, [file, onUnavailable])

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

  const startDraw = (event: ReactPointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    const node = event.currentTarget as HTMLElement
    const rect = overlay.current!.getBoundingClientRect()
    const from = {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    }
    node.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
      setDrawing({
        page,
        x: Math.min(from.x, x),
        y: Math.min(from.y, y),
        w: Math.abs(x - from.x),
        h: Math.abs(y - from.y),
      })
    }

    const stop = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', stop)
      node.removeEventListener('pointercancel', stop)
      setDrawing((current) => {
        if (current && current.w > MIN_SIDE && current.h > MIN_SIDE) {
          onBoxesChange([...boxes, current])
        }
        return null
      })
    }

    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', stop)
    node.addEventListener('pointercancel', stop)
  }

  const onThisPage = boxes.filter((box) => box.page === page)
  const style = (box: FractionBox) => ({
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  })

  return (
    <Panel
      label={label}
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
          {boxes.length} drawn · {matched.length} matched
        </span>

        {boxes.length > 0 && (
          <Button variant="outline" onClick={() => onBoxesChange([])} className="h-8 px-2.5">
            <TrashIcon />
            CLEAR
          </Button>
        )}

        <span id={hintId} className="ml-auto readout text-[10px] text-faint">
          {hint}
        </span>
      </div>

      <div className="mt-3 flex justify-center border border-line-soft bg-raised p-4">
        <div className="relative w-full max-w-[760px]" style={{ aspectRatio: ratio || 0.7071 }}>
          <div ref={holder} className="absolute inset-0" />
          <div
            ref={overlay}
            onPointerDown={startDraw}
            aria-describedby={hintId}
            className="absolute inset-0 cursor-crosshair touch-none"
          >
            {matched
              .filter((box) => box.page === page)
              .map((box, i) => (
                <div
                  key={`m${i}`}
                  className="absolute border border-primary bg-primary/30"
                  style={style(box)}
                  aria-hidden
                />
              ))}

            {onThisPage.map((box) => (
              <div key={`${box.x}-${box.y}-${box.w}`} className="absolute" style={style(box)}>
                <div className={`size-full ${fill}`} aria-hidden />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onBoxesChange(boxes.filter((b) => b !== box))}
                  aria-label={`Remove box at ${Math.round(box.x * 100)}, ${Math.round(box.y * 100)} percent`}
                  className="absolute -top-2 -right-2 grid size-5 place-items-center border border-line-strong bg-card text-[10px] text-dim hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}

            {drawing && (
              <div
                className={`absolute border border-primary ${fill}`}
                style={style(drawing)}
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
