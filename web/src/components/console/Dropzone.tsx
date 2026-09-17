import { useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'

interface DropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string[]
  multiple?: boolean
  className?: string
  hint?: string
}

export function Dropzone({ onFiles, accept, multiple = true, className, hint }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    if (!list?.length) return
    const files = Array.from(list)
    onFiles(multiple ? files : files.slice(0, 1))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex min-h-24 cursor-pointer flex-col items-center justify-center border border-dashed border-line p-4 text-center readout leading-relaxed text-dim transition-colors outline-none',
        'hover:border-primary/70 hover:bg-primary/5 focus-visible:border-primary focus-visible:bg-primary/5',
        over && 'border-primary bg-primary/10 text-foreground',
        className,
      )}
    >
      <span>{over ? 'Release to stage' : 'Drop files here'}</span>
      <span className="text-primary">or browse</span>
      {hint && (
        <span className="mt-2 text-[10px] tracking-[0.06em] text-faint normal-case">{hint}</span>
      )}
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={accept?.join(',')}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
