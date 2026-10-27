import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Panel } from '@/components/console/Panel'
import { clampCrop, type CropBox } from '@/ops/image/geometry'
import { toDecodable } from '@/ops/image/heic'

/**
 * The crop rectangle, drawn over the first picture.
 *
 * Like the page placers, it only ever produces fractions of the image, so the
 * same box means the same part of a photo however large it is on screen, and
 * the same proportions of every other photo in the batch. Moving and resizing
 * are pointer interactions; the numeric fields beside it are the keyboard way
 * to the same result, and arrow keys nudge the box when it has focus.
 */

type Corner = 'nw' | 'ne' | 'sw' | 'se'

interface CropFrameProps {
  file: File
  box: CropBox
  onChange: (box: CropBox) => void
  /** pixel width over pixel height to hold while resizing; undefined for free */
  ratio?: number
  /** reports the picture's pixel size once it is known */
  onSize?: (size: { width: number; height: number }) => void
}

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n))

export function CropFrame({ file, box, onChange, ratio, onSize }: CropFrameProps) {
  const frame = useRef<HTMLDivElement>(null)
  // tied to the file it was made for, so a new file never shows the last one's state
  const [preview, setPreview] = useState<{ for: File; src?: string; error?: string }>()
  const [size, setSize] = useState<{ width: number; height: number }>()
  const hintId = useId()
  const src = preview?.for === file ? preview.src : undefined
  const error = preview?.for === file ? preview.error : undefined

  // HEIC has to be decoded before an <img> in most browsers can show it
  useEffect(() => {
    let url: string | undefined
    let live = true
    toDecodable(file)
      .then((blob) => {
        if (!live) return
        url = URL.createObjectURL(blob)
        setPreview({ for: file, src: url })
      })
      .catch(() => live && setPreview({ for: file, error: 'This picture cannot be previewed' }))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  /** fraction-space height for a fraction-space width, at the locked pixel ratio */
  const heightFor = (w: number) => (size && ratio ? (w * size.width) / (size.height * ratio) : null)

  const startMove = (event: ReactPointerEvent) => {
    event.preventDefault()
    const rect = frame.current!.getBoundingClientRect()
    const grab = {
      x: (event.clientX - rect.left) / rect.width - box.x,
      y: (event.clientY - rect.top) / rect.height - box.y,
    }
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      onChange(
        clampCrop({
          ...box,
          x: (e.clientX - rect.left) / rect.width - grab.x,
          y: (e.clientY - rect.top) / rect.height - grab.y,
        }),
      )
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

  const startResize = (corner: Corner) => (event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = frame.current!.getBoundingClientRect()
    const node = event.currentTarget as HTMLElement
    node.setPointerCapture(event.pointerId)

    // the corner opposite the one being dragged stays put
    const fixedX = corner.includes('w') ? box.x + box.w : box.x
    const fixedY = corner.includes('n') ? box.y + box.h : box.y

    const move = (e: PointerEvent) => {
      const px = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const py = clamp((e.clientY - rect.top) / rect.height, 0, 1)
      let w = Math.max(0.02, Math.abs(px - fixedX))
      let h = Math.max(0.02, Math.abs(py - fixedY))

      const locked = heightFor(w)
      if (locked !== null) {
        h = locked
        // never let the locked shape run past the edge it is growing towards
        const roomY = corner.includes('n') ? fixedY : 1 - fixedY
        const roomX = corner.includes('w') ? fixedX : 1 - fixedX
        if (h > roomY) {
          w *= roomY / h
          h = roomY
        }
        if (w > roomX) {
          h *= roomX / w
          w = roomX
        }
      }

      onChange(
        clampCrop({
          x: corner.includes('w') ? fixedX - w : fixedX,
          y: corner.includes('n') ? fixedY - h : fixedY,
          w,
          h,
        }),
      )
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
    const delta = moves[event.key]
    if (!delta) return
    event.preventDefault()
    onChange(clampCrop({ ...box, x: box.x + delta[0], y: box.y + delta[1] }))
  }

  const pixels = size
    ? `${Math.round(box.w * size.width)} × ${Math.round(box.h * size.height)} px`
    : ''

  const corners: Corner[] = ['nw', 'ne', 'sw', 'se']
  const cornerClass: Record<Corner, string> = {
    nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
    ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
  }

  return (
    <Panel
      label="C · Crop"
      tone="deep"
      meta={
        error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-dim">{pixels || 'Opening…'}</span>
        )
      }
    >
      <p id={hintId} className="mt-3.5 readout text-[10px] text-faint">
        Drag the box to move it · corners to resize · arrows to nudge · or type exact values
      </p>

      <div className="mt-3 flex justify-center border border-line-soft bg-raised p-4">
        {src && (
          <div ref={frame} className="relative inline-block max-w-full touch-none select-none">
            <img
              src={src}
              alt=""
              draggable={false}
              className="block max-h-[min(60vh,560px)] max-w-full"
              onLoad={(e) => {
                const next = {
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                }
                setSize(next)
                onSize?.(next)
              }}
            />
            {/* everything outside the crop is dimmed by one large shadow, clipped
                to the picture so it does not spill onto the panel */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div
                className="absolute"
                style={{
                  // the page background, so the dimmed area reads as recessed
                  boxShadow: '0 0 0 9999px rgb(4 7 13 / 0.62)',
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              />
            </div>
            <div
              role="application"
              tabIndex={0}
              aria-label="Crop area"
              aria-roledescription="Movable crop box"
              aria-describedby={hintId}
              onPointerDown={startMove}
              onKeyDown={onKeyDown}
              className="absolute cursor-move border border-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            >
              {corners.map((corner) => (
                <span
                  key={corner}
                  onPointerDown={startResize(corner)}
                  className={`absolute size-3 border border-primary bg-primary ${cornerClass[corner]}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
