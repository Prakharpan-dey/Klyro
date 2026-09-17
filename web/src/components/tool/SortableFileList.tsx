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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVerticalIcon } from '@phosphor-icons/react'
import { describeMeta } from '@/components/console/describeMeta'
import { FileRow } from '@/components/console/FileRow'
import { cn } from '@/lib/utils'
import type { ToolFile } from './useToolFiles'

interface SortableFileListProps {
  files: ToolFile[]
  onMove: (fromId: string, toId: string) => void
  onRemove?: (id: string) => void
  disabled?: boolean
}

function SortableRow({
  item,
  position,
  onRemove,
  disabled,
}: {
  item: ToolFile
  position: number
  onRemove?: (id: string) => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-stretch', isDragging && 'relative z-10 opacity-90')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.file.name}, position ${position}`}
        className="flex w-9 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-0.5 border border-r-0 border-line-soft bg-well text-[10px] text-primary hover:text-foreground active:cursor-grabbing disabled:cursor-default"
        disabled={disabled}
      >
        {String(position).padStart(2, '0')}
        <DotsSixVerticalIcon className="size-3.5 text-faint" />
      </button>
      <FileRow
        file={item.file}
        detail={describeMeta(item.meta, item.file.size)}
        onRemove={onRemove && !disabled ? () => onRemove(item.id) : undefined}
        className={cn('flex-1', isDragging && 'border-primary')}
      />
    </div>
  )
}

export function SortableFileList({ files, onMove, onRemove, disabled }: SortableFileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-[7px]">
          {files.map((f, i) => (
            <SortableRow
              key={f.id}
              item={f}
              position={i + 1}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
