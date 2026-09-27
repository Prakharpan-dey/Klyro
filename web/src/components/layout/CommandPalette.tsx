import { useEffect, useRef } from 'react'
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
  const restoreTo = useRef<HTMLElement | null>(null)
  const navigated = useRef(false)

  // whatever held focus when the palette opened; Ctrl-K often fires with nothing
  // focused, and Radix then hands focus back to <body>
  useEffect(() => {
    if (open) restoreTo.current = document.activeElement as HTMLElement | null
  }, [open])

  const go = (to: string) => {
    navigated.current = true
    onOpenChange(false)
    navigate(to)
  }

  /*
   * Radix's own hook, rather than a rAF after onOpenChange: moving focus while
   * the exit animation runs leaves Presence waiting for an animationend that
   * never arrives, and the dialog stays mounted at data-state="closed".
   */
  const restoreFocus = (event: Event) => {
    event.preventDefault()
    if (navigated.current) {
      navigated.current = false
      return
    }
    const target = restoreTo.current
    if (target && target !== document.body && document.contains(target)) target.focus()
    else document.getElementById('work')?.focus()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a tool"
      onCloseAutoFocus={restoreFocus}
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
