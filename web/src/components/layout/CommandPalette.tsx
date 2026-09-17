import { useNavigate } from 'react-router'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { categoryLabel, tools } from '@/tools/registry'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const categories = [...new Set(tools.map((t) => t.category))]

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a tool"
      className="border border-line"
    >
      <CommandInput placeholder="Search tools…" />
      <CommandList>
        <CommandEmpty>No matching tool.</CommandEmpty>
        {categories.map((cat) => (
          <CommandGroup key={cat} heading={categoryLabel[cat]}>
            {tools
              .filter((t) => t.category === cat)
              .map((t) => (
                <CommandItem
                  key={t.slug}
                  value={`${t.title} ${t.summary} ${t.code}`}
                  onSelect={() => go(`/tools/${t.slug}`)}
                >
                  <span className="font-sans text-[13px]">{t.title}</span>
                  <span className="truncate text-faint">{t.summary}</span>
                  <CommandShortcut>{t.code}</CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go('/')}>Home console</CommandItem>
          <CommandItem onSelect={() => go('/privacy')}>How privacy works</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
