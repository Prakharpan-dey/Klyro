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
import { toolGroups, tools } from '@/tools/registry'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()

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
      /*
       * The shared dialog is sized for a short menu: sm:max-w-sm wraps these titles
       * onto two lines and truncates the summaries to nothing. Fifty-six tools with a
       * one-line description each need the width, and sitting high leaves room for a
       * list deep enough to scan.
       */
      className="top-[8vh] w-[min(56rem,calc(100%-2rem))] max-w-none translate-y-0 border border-line sm:max-w-none"
    >
      <CommandInput placeholder="Search tools…" />
      <CommandList className="max-h-[min(66vh,560px)]">
        <CommandEmpty>No matching tool.</CommandEmpty>
        {/* same sections as the rail, so the two ways in agree on one taxonomy */}
        {toolGroups.map((section) => (
          <CommandGroup key={section.group} heading={`${section.group} · ${section.tools.length}`}>
            {section.tools.map((t) => (
              <CommandItem
                key={t.slug}
                value={`${t.title} ${t.summary} ${t.code}`}
                onSelect={() => go(`/tools/${t.slug}`)}
              >
                <span className="shrink-0 font-sans text-[13px] text-foreground sm:w-[10.5rem]">
                  {t.title}
                </span>
                {/* min-w-0 is what lets a long summary ellipsise instead of shoving the code off */}
                <span className="hidden min-w-0 flex-1 truncate text-faint sm:block">
                  {t.summary}
                </span>
                <CommandShortcut className="shrink-0 whitespace-nowrap">{t.code}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go('/console')}>
            <span className="shrink-0 font-sans text-[13px] text-foreground sm:w-[10.5rem]">
              Home console
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-faint sm:block">
              Describe a job and run it on {tools.length} tools
            </span>
          </CommandItem>
          <CommandItem onSelect={() => go('/privacy')}>
            <span className="shrink-0 font-sans text-[13px] text-foreground sm:w-[10.5rem]">
              How privacy works
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-faint sm:block">
              Exactly what is sent, and what never is
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
