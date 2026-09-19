import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Panel } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import { closePdf, openPdf, renderPage } from '@/ops/pdf/pdfjs'
import type { PlacedBox } from '@/ops/pdf/stamp'
import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * Put something exactly where you want it on a page.
 *
 * The overlay covers the rendered page one-to-one, so a pointer position
 * divided by the overlay's own size is already a fraction of the page as the
 * reader sees it. That is the only number this component produces; the PDF
 * side of the maths lives in placeImage, where it can be tested.
 */

interface PagePlacerProps {
  file: File
  page: number
  onPageChange: (page: number) => void
  box: PlacedBox
  onBoxChange: (box: PlacedBox) => void
  /** object URL of the mark being placed */
  src?: string
  /** width divided by height of that mark, to keep it undistorted */
  aspect: number
  onUnavailable?: () => void
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function PagePlacer({
  file,
  page,
  onPageChange,
  box,
  onBoxChange,
  src,
  aspect,
  onUnavailable,
}: PagePlacerProps) {
  const holder = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const doc = useRef<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState(0)
  const [ratio, setRatio] = useState(1)
  const [error, setError] = useState<string>()

  // one document, held open for the life of the panel: reopening per render is
  // what makes page flipping feel slow
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

  // render the current page, ignoring anything that finished out of order
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

  const fractionAt = (event: ReactPointerEvent) => {
    const rect = overlay.current!.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
  }

  const startDrag = (event: ReactPointerEvent) => {
    event.preventDefault()
    const at = fractionAt(event)
    const grab = { x: at.x - box.x, y: at.y - box.y }
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      const rect = overlay.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - grab.x
      const y = (e.clientY - rect.top) / rect.height - grab.y
      onBoxChange({ ...box, x: clamp(x, 0, 1 - box.w), y: clamp(y, 0, 1 - box.h) })
    }
    const stop = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', stop)
      node.removeEventListener('pointercancel', stop)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', stop)
    node.addEventListener('pointercancel', stop)
  }

  const startResize = (event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      const rect = overlay.current!.getBoundingClientRect()
      const w = clamp((e.clientX - rect.left) / rect.width - box.x, 0.04, 1 - box.x)
      // keep the mark's own proportions, measured against the page's
      const h = (w * rect.width) / aspect / rect.height
      if (box.y + h > 1) return
      onBoxChange({ ...box, w, h })
    }
    const stop = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', stop)
      node.removeEventListener('pointercancel', stop)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', stop)
    node.addEventListener('pointercancel', stop)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.05 : 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      onBoxChange({
        ...box,
        x: clamp(box.x + move[0], 0, 1 - box.w),
        y: clamp(box.y + move[1], 0, 1 - box.h),
      })
      return
    }
    if (event.key === '+' || event.key === '-') {
      event.preventDefault()
      const rect = overlay.current!.getBoundingClientRect()
      const w = clamp(box.w + (event.key === '+' ? 0.02 : -0.02), 0.04, 1 - box.x)
      onBoxChange({ ...box, w, h: (w * rect.width) / aspect / rect.height })
    }
  }

  return (
    <Panel
      label="C · Placement"
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
          X {Math.round(box.x * 100)}% · Y {Math.round(box.y * 100)}% · W {Math.round(box.w * 100)}%
        </span>
        <span className="ml-auto readout text-[10px] text-faint">
          Drag it · corner to resize · arrows to nudge
        </span>
      </div>

      <div className="mt-3 flex justify-center border border-line-soft bg-[#0b1526] p-4">
        <div className="relative w-full max-w-[760px]" style={{ aspectRatio: ratio || 0.7071 }}>
          {/* the canvas gets its own layer: replacing its children must not
              touch the overlay React renders on top */}
          <div ref={holder} className="absolute inset-0" />
          <div ref={overlay} className="absolute inset-0 touch-none">
            {src && (
              <div
                role="group"
                tabIndex={0}
                aria-label="Signature position"
                onPointerDown={startDrag}
                onKeyDown={onKeyDown}
                className="absolute cursor-move border border-primary bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              >
                <img src={src} alt="" className="pointer-events-none size-full object-contain" />
                <span
                  onPointerDown={startResize}
                  className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize border border-primary bg-primary"
                  aria-hidden
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
