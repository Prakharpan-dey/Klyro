import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowUUpLeftIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface PageCard {
  id: string
  index: number
  rotate: number
  deleted: boolean
}

interface PageGridProps {
  pages: PageCard[]
  thumbs: string[]
  onChange: (update: (pages: PageCard[]) => PageCard[]) => void
  disabled?: boolean
}

const iconButton =
  'flex size-7 items-center justify-center border border-line-soft bg-well text-soft transition-colors hover:border-primary hover:text-foreground disabled:opacity-40'

function Card({
  page,
  position,
  thumb,
  onUpdate,
  disabled,
}: {
  page: PageCard
  position: number
  thumb?: string
  onUpdate: (patch: (page: PageCard) => Partial<PageCard>) => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    disabled,
  })
  const sideways = page.rotate % 180 !== 0

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-col border border-line-soft bg-well',
        isDragging && 'relative z-10 border-primary shadow-[0_12px_30px_rgba(0,0,0,.5)]',
        page.deleted && 'border-destructive/40',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Page ${page.index + 1}, position ${position}. Drag to move.`}
        className="relative flex aspect-[3/4] cursor-grab touch-none items-center justify-center overflow-hidden bg-[#0b1526] p-2 active:cursor-grabbing"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            draggable={false}
            className={cn(
              'max-h-full max-w-full bg-white shadow-sm transition-transform duration-200',
              page.deleted && 'opacity-25 grayscale',
            )}
            style={{ transform: `rotate(${page.rotate}deg) scale(${sideways ? 0.75 : 1})` }}
          />
        ) : (
          <div className="stripes size-full" />
        )}
        {page.deleted && (
          <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 border border-destructive/60 bg-background/80 py-1 text-center readout text-[10px] text-destructive">
            Removed
          </span>
        )}
      </button>
      <div className="flex items-center justify-between gap-1 border-t border-line-soft px-1.5 py-1.5">
        <span className="pl-1 text-[10px] tracking-[0.08em] text-primary">
          {String(position).padStart(2, '0')}
          <span className="text-faint"> · p{page.index + 1}</span>
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className={iconButton}
            disabled={disabled || page.deleted}
            onClick={() => onUpdate((p) => ({ rotate: (p.rotate + 270) % 360 }))}
            aria-label={`Rotate page ${page.index + 1} left`}
          >
            <ArrowCounterClockwiseIcon className="size-3.5" />
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={disabled || page.deleted}
            onClick={() => onUpdate((p) => ({ rotate: (p.rotate + 90) % 360 }))}
            aria-label={`Rotate page ${page.index + 1} right`}
          >
            <ArrowClockwiseIcon className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(
              iconButton,
              !page.deleted && 'hover:border-destructive hover:text-destructive',
            )}
            disabled={disabled}
            onClick={() => onUpdate((p) => ({ deleted: !p.deleted }))}
            aria-label={
              page.deleted ? `Restore page ${page.index + 1}` : `Remove page ${page.index + 1}`
            }
          >
            {page.deleted ? (
              <ArrowUUpLeftIcon className="size-3.5" />
            ) : (
              <TrashIcon className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PageGrid({ pages, thumbs, onChange, disabled }: PageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onChange((prev) =>
      arrayMove(
        prev,
        prev.findIndex((p) => p.id === active.id),
        prev.findIndex((p) => p.id === over.id),
      ),
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5">
          {pages.map((page, i) => (
            <Card
              key={page.id}
              page={page}
              position={i + 1}
              thumb={thumbs[page.index]}
              disabled={disabled}
              onUpdate={(patch) =>
                onChange((prev) => prev.map((p) => (p.id === page.id ? { ...p, ...patch(p) } : p)))
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
