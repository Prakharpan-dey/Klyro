import type { Anchor } from '@/ops/pdf/stamp'
import { cn } from '@/lib/utils'

const LAYOUT: { value: Anchor; label: string }[][] = [
  [
    { value: 'top-left', label: 'Top left' },
    { value: 'top-center', label: 'Top centre' },
    { value: 'top-right', label: 'Top right' },
  ],
  [
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'center', label: 'Centre' },
    { value: 'bottom-right', label: 'Bottom right' },
  ],
]

interface AnchorPickerProps {
  value: Anchor
  onChange: (anchor: Anchor) => void
  /** drop the centre option for tools that always sit at an edge */
  edgesOnly?: boolean
}

export function AnchorPicker({ value, onChange, edgesOnly }: AnchorPickerProps) {
  const rows = edgesOnly
    ? [
        LAYOUT[0],
        [
          { value: 'bottom-left' as Anchor, label: 'Bottom left' },
          { value: 'bottom-center' as Anchor, label: 'Bottom centre' },
          { value: 'bottom-right' as Anchor, label: 'Bottom right' },
        ],
      ]
    : LAYOUT

  return (
    <div className="grid grid-cols-3 gap-px border border-line-soft bg-line-soft">
      {rows.flat().map((cell) => (
        <button
          key={cell.value}
          type="button"
          aria-label={cell.label}
          aria-pressed={value === cell.value}
          onClick={() => onChange(cell.value)}
          className={cn(
            'flex h-10 items-center justify-center bg-well text-[10px] tracking-[0.08em] text-faint uppercase transition-colors hover:text-foreground',
            value === cell.value && 'bg-primary text-primary-foreground',
          )}
        >
          {cell.label.replace('Bottom ', 'B ').replace('Top ', 'T ')}
        </button>
      ))}
    </div>
  )
}
