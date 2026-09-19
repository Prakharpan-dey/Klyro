import { useEffect, useRef, useState } from 'react'
import { Dropzone } from '@/components/console/Dropzone'
import { SignaturePad } from '@/components/console/SignaturePad'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Three ways to produce the same thing: a transparent PNG and the shape of it.
 *
 * Typing is rasterised rather than stamped as text, so everything downstream —
 * the drag box, the preview, the placement — only ever handles a picture. It
 * also sidesteps the built-in PDF fonts, which have no script face and cannot
 * write a name in Devanagari at all.
 */

export interface SignatureImage {
  blob: Blob
  url: string
  /** width divided by height */
  aspect: number
}

const SCRIPT_FONTS = `'Segoe Script', 'Bradley Hand', 'Brush Script MT', 'Snell Roundhand', cursive`

async function measure(blob: Blob): Promise<SignatureImage> {
  const bitmap = await createImageBitmap(blob)
  const aspect = bitmap.width / Math.max(1, bitmap.height)
  bitmap.close()
  return { blob, url: URL.createObjectURL(blob), aspect }
}

/** Draws the name at four times the size it will be used, so it stays crisp. */
async function renderTyped(name: string): Promise<Blob | null> {
  if (!name.trim()) return null
  const scale = 4
  const size = 64 * scale
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = `${size}px ${SCRIPT_FONTS}`
  const width = Math.ceil(probe.measureText(name).width) + size

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(size * 1.8)
  const ctx = canvas.getContext('2d')!
  ctx.font = `${size}px ${SCRIPT_FONTS}`
  ctx.fillStyle = '#0b1220'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, size / 2, canvas.height / 2)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Re-encodes an uploaded picture as PNG, optionally lifting the paper away.
 * A phone photo of a signature is ink on white; knocking the white out is what
 * makes it sit on the page instead of in a box.
 */
async function renderUploaded(file: File, knockout: boolean): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  if (knockout) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = pixels.data
    for (let i = 0; i < data.length; i += 4) {
      const darkest = Math.min(data[i], data[i + 1], data[i + 2])
      if (darkest > 235) data[i + 3] = 0
      else if (darkest > 190) data[i + 3] = Math.round(data[i + 3] * ((235 - darkest) / 45))
    }
    ctx.putImageData(pixels, 0, 0)
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

interface SignatureSourceProps {
  onChange: (signature: SignatureImage | null) => void
}

export function SignatureSource({ onChange }: SignatureSourceProps) {
  const [typed, setTyped] = useState('')
  const [uploaded, setUploaded] = useState<File>()
  const [knockout, setKnockout] = useState(true)
  const previous = useRef<string>('')

  const emit = (image: SignatureImage | null) => {
    if (previous.current) URL.revokeObjectURL(previous.current)
    previous.current = image?.url ?? ''
    onChange(image)
  }

  // the drawn pad reports a blob; the other two are rendered here
  const fromBlob = async (blob: Blob | null) => emit(blob ? await measure(blob) : null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const blob = await renderTyped(typed)
      if (!cancelled && typed.trim()) await fromBlob(blob)
      if (!cancelled && !typed.trim()) emit(null)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed])

  useEffect(() => {
    if (!uploaded) return
    let cancelled = false
    renderUploaded(uploaded, knockout).then(async (blob) => {
      if (!cancelled && blob) await fromBlob(blob)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploaded, knockout])

  return (
    <Tabs defaultValue="draw" onValueChange={() => emit(null)}>
      <TabsList className="w-full">
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
        <TabsTrigger value="upload">Image</TabsTrigger>
      </TabsList>

      <TabsContent value="draw" className="mt-3">
        <SignaturePad onChange={(png) => void fromBlob(png)} />
      </TabsContent>

      <TabsContent value="type" className="mt-3 flex flex-col gap-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Your name"
          aria-label="Signature text"
          className="h-10 text-sm"
        />
        <p
          className="border border-line-soft bg-white px-3 py-2 text-[26px] leading-tight text-[#0b1220]"
          style={{ fontFamily: SCRIPT_FONTS }}
        >
          {typed || 'Your name'}
        </p>
        <p className="readout text-[10px] text-faint">Written in a handwriting face, then drawn</p>
      </TabsContent>

      <TabsContent value="upload" className="mt-3 flex flex-col gap-2">
        <Dropzone
          onFiles={(picked) => setUploaded(picked[0])}
          accept={['image/png', 'image/jpeg', 'image/webp']}
          multiple={false}
          hint="A photo or scan of your signature"
        />
        {uploaded && <p className="readout text-[10px] text-dim">{uploaded.name}</p>}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="sig-knockout" className="label">
            Lift the paper away
          </Label>
          <Switch id="sig-knockout" checked={knockout} onCheckedChange={setKnockout} />
        </div>
        <p className="readout text-[10px] text-faint">
          Turns the white background transparent, so only the ink lands on the page
        </p>
      </TabsContent>
    </Tabs>
  )
}
