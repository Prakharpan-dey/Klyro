import { useEffect, useRef, type ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

function Thumb({ file }: { file: File }) {
  const img = useRef<HTMLImageElement>(null)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage || !img.current) return
    const url = URL.createObjectURL(file)
    img.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <div className="stripes h-[34px] w-[26px] shrink-0 overflow-hidden border border-line">
      {isImage && <img ref={img} alt="" className="size-full object-cover" />}
    </div>
  )
}

interface FileRowProps {
  file: File
  detail: ReactNode
  onRemove?: () => void
  className?: string
}

export function FileRow({ file, detail, onRemove, className }: FileRowProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-[11px] border border-line-soft bg-well px-2.5 py-[9px]',
        className,
      )}
    >
      <Thumb file={file} />
      <div className="min-w-0 flex-1">
        <div
          className="truncate font-sans text-xs leading-snug font-medium text-foreground"
          title={file.name}
        >
          {file.name}
        </div>
        <div className="text-[10px] leading-snug tracking-[0.06em] text-dim uppercase">
          {detail}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="p-1 text-faint opacity-60 transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}
