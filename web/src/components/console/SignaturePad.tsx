import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  /** called with a transparent PNG whenever the drawing changes */
  onChange: (png: Blob | null) => void
}

const WIDTH = 640
const HEIGHT = 240

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1220'
  }, [])

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const emit = () => {
    canvasRef.current?.toBlob((blob) => onChange(blob), 'image/png')
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const { x, y } = pointAt(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointAt(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    emit()
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Draw your signature"
        className="h-32 w-full touch-none border border-line bg-white"
      />
      <div className="flex items-center justify-between">
        <span className="readout text-[10px] text-faint">
          {hasInk ? 'Signature ready' : 'Draw with a mouse, pen or finger'}
        </span>
        <Button variant="outline" size="sm" onClick={clear} disabled={!hasInk}>
          CLEAR
        </Button>
      </div>
    </div>
  )
}
