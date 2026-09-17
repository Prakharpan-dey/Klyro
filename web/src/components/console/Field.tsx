import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor?: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, aside, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor} className="label">
          {label}
        </Label>
        {aside && <span className="readout text-[10px] text-foreground">{aside}</span>}
      </div>
      {children}
    </div>
  )
}
