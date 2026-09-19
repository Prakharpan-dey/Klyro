import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { toolGroups, tools, type Tool } from '@/tools/registry'

/**
 * The tool list, always in reach.
 *
 * Fifty-six tools in eight groups is more than a page of list, so the filter
 * box does the work collapsible sections would otherwise do: one keystroke
 * takes it to a handful, and nothing has to remember which section was open.
 */

function matches(tool: Tool, query: string): boolean {
  return `${tool.title} ${tool.summary} ${tool.code}`.toLowerCase().includes(query)
}

function itemClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'block border-l-2 px-3 py-[7px] transition-colors',
    isActive
      ? 'border-primary bg-primary/12'
      : 'border-transparent hover:bg-accent hover:border-line',
  )
}

function ToolLink({ tool, active }: { tool: Tool; active: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // arriving by palette or by deep link should reveal where you landed
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <NavLink ref={ref} to={`/tools/${tool.slug}`} className={itemClass} title={tool.summary}>
      <span
        className={cn(
          'block font-sans text-[12.5px] leading-tight',
          active ? 'text-foreground' : 'text-soft',
        )}
      >
        {tool.title}
      </span>
      <span className="readout text-[9px] text-faint">{tool.code}</span>
    </NavLink>
  )
}

export function ToolNavBody() {
  const [query, setQuery] = useState('')
  const { pathname } = useLocation()
  const slug = pathname.startsWith('/tools/') ? pathname.slice('/tools/'.length) : ''

  const q = query.trim().toLowerCase()
  const found = q ? tools.filter((tool) => matches(tool, q)) : []

  return (
    <>
      <div className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-[11px]">
        <span className="label">Tools</span>
        <span className="readout text-[10px] text-primary">
          {q ? `${found.length} of ${tools.length}` : tools.length}
        </span>
      </div>

      <div className="border-b border-line-soft p-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          aria-label="Filter tools"
          className="h-8 w-full border border-line bg-well px-2 font-mono text-[11px] text-foreground outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain pb-4">
        {q ? (
          found.length ? (
            found.map((tool) => (
              <ToolLink key={tool.slug} tool={tool} active={tool.slug === slug} />
            ))
          ) : (
            <p className="px-3 py-4 font-sans text-[12px] text-faint">Nothing matches “{query}”.</p>
          )
        ) : (
          toolGroups.map((section) => (
            <div key={section.group}>
              <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                <span className="label text-faint">{section.group}</span>
                <span className="h-px flex-1 bg-line-soft" aria-hidden />
              </div>
              {section.tools.map((tool) => (
                <ToolLink key={tool.slug} tool={tool} active={tool.slug === slug} />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}

export function ToolNav() {
  return (
    <aside className="hidden w-[212px] shrink-0 border-r border-line bg-panel lg:block xl:w-[244px]">
      {/*
       * Sticky between the two pinned bars. The height cap has to allow for both
       * (44px + 36px): this list is long enough to reach its cap, so the cap is
       * what sets the row height, and anything larger scrolls the whole page.
       */}
      <div className="sticky top-11 flex max-h-[calc(100dvh-80px)] min-h-0 flex-col">
        <ToolNavBody />
      </div>
    </aside>
  )
}
