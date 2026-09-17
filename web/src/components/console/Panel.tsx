import type { ReactNode } from 'react'
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
  return (
    <section
      id={id}
      className={cn(
        'min-w-0 border border-line p-[18px]',
        tone === 'deep' ? 'bg-panel' : 'bg-card',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="label">{label}</h2>
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
