import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  id?: string
  label: string
  meta?: ReactNode
  className?: string
  tone?: 'default' | 'deep'
  children: ReactNode
}

export function Panel({ id, label, meta, className, tone = 'default', children }: PanelProps) {
  const labelId = useId()
  return (
    <section
      id={id}
      aria-labelledby={labelId}
      className={cn(
        'min-w-0 border border-line p-[18px]',
        tone === 'deep' ? 'bg-panel' : 'bg-card',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        {/*
         * A named region, not a heading: these labels are panel chrome, and as
         * headings they landed above the page's own h1 in the outline.
         */}
        <div id={labelId} className="label">
          {label}
        </div>
        {meta && <div className="readout text-[10px] leading-none font-medium">{meta}</div>}
      </header>
      {children}
    </section>
  )
}

export function ReadoutRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={cn('text-right text-foreground', className)}>{value}</span>
    </div>
  )
}
