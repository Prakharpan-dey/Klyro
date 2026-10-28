import { useState } from 'react'
import { Link } from 'react-router'
import { PAGE_SEO } from '@/lib/seo'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { Dropzone } from '@/components/console/Dropzone'
import { describeMeta } from '@/components/console/describeMeta'
import { FileRow } from '@/components/console/FileRow'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { matchesAccept } from '@/lib/fileMeta'
import { toolGroups, tools, type Tool } from '@/tools/registry'

/**
 * Every tool on one page.
 *
 * Files dropped on the landing page arrive here staged, and the list narrows to
 * the tools that can take them, so "I have three PDFs" becomes a short list
 * instead of eighty names. Opening a tool carries the staged files in with it.
 */

function matches(tool: Tool, query: string): boolean {
  return `${tool.title} ${tool.summary} ${tool.code} ${tool.group} ${tool.slug.replace(/-/g, ' ')}`
    .toLowerCase()
    .includes(query)
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function ToolTile({ tool }: { tool: Tool }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="group flex flex-col gap-1.5 border border-line-soft bg-well px-3.5 py-3 transition-colors hover:border-primary hover:bg-primary/8 focus-visible:border-primary focus-visible:outline-none"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-sans text-[13.5px] leading-tight font-medium text-foreground">
          {tool.title}
        </span>
        <span className="readout shrink-0 text-[9px] text-faint group-hover:text-primary">
          {tool.code}
        </span>
      </span>
      <span className="font-sans text-[12px] leading-snug text-soft">{tool.summary}</span>
    </Link>
  )
}

function DirectoryPanel() {
  const { files } = useWorkspace()
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const q = query.trim().toLowerCase()
  const fitting = (tool: Tool) => files.some((f) => matchesAccept(f.file, tool.accept))
  const narrowed = files.length > 0 && !showAll
  const keep = (tool: Tool) => (!q || matches(tool, q)) && (!narrowed || fitting(tool))

  const sections = toolGroups
    .map((section) => ({ ...section, tools: section.tools.filter(keep) }))
    .filter((section) => section.tools.length > 0)
  const shown = sections.reduce((n, section) => n + section.tools.length, 0)

  return (
    <Panel
      label="A · Tools"
      tone="deep"
      className="px-6 py-[26px]"
      meta={
        <span className="text-primary">
          {shown === tools.length ? tools.length : `${shown} of ${tools.length}`}
        </span>
      }
    >
      <h1 className="mt-4 font-sans text-[30px] leading-[1.06] font-medium tracking-[-0.035em] text-foreground sm:text-[38px]">
        All tools
      </h1>
      <p className="mt-3.5 max-w-[52ch] font-sans text-[14.5px] leading-relaxed text-pretty text-soft">
        {tools.length} tools for images, PDFs and video. Each one runs in this tab, and nothing you
        give it is sent anywhere.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search: compress, merge, heic, sign…"
        aria-label="Search tools"
        className="mt-6 h-11 w-full border border-primary bg-sunken px-3.5 font-mono text-[13px] text-foreground shadow-[0_0_0_3px_rgba(77,184,255,.1)] outline-none placeholder:text-faint focus:shadow-[0_0_0_3px_rgba(77,184,255,.25)]"
      />

      {files.length > 0 && (
        <p role="status" className="mt-3 readout text-[10px] text-faint">
          {narrowed
            ? `Showing the tools that take your ${plural(files.length, 'staged file')} · `
            : `Showing every tool · `}
          <button
            type="button"
            onClick={() => setShowAll((all) => !all)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {narrowed ? 'show all' : 'only ones that fit'}
          </button>
        </p>
      )}

      {sections.length ? (
        <div className="mt-6 flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.group} aria-label={section.group}>
              <h2 className="label">
                {section.group}{' '}
                <span className="readout text-[10px] text-faint">{section.tools.length}</span>
              </h2>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {section.tools.map((tool) => (
                  <ToolTile key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 font-sans text-[13px] text-faint">
          Nothing matches “{query.trim()}”{narrowed ? ' among the tools that take your files' : ''}.
        </p>
      )}
    </Panel>
  )
}

function IntakePanel() {
  const { files, add, remove, clear } = useWorkspace()
  return (
    <Panel
      label="B · Intake"
      className="flex flex-col"
      meta={
        files.length ? (
          <button type="button" onClick={clear} className="text-local hover:text-foreground">
            {files.length} staged · clear
          </button>
        ) : (
          <span className="text-dim">Empty</span>
        )
      }
    >
      {files.length > 0 && (
        <div className="mt-3.5 flex max-h-[380px] flex-col gap-[7px] overflow-y-auto">
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f.file}
              detail={describeMeta(f.meta, f.file.size)}
              onRemove={() => remove(f.id)}
            />
          ))}
        </div>
      )}
      <Dropzone
        onFiles={add}
        className="mt-[11px]"
        hint="Drop files to see which tools take them. They stay in this tab's memory."
      />
    </Panel>
  )
}

function TelemetryPanel() {
  const { pool, online, offOrigin } = useTelemetry()
  return (
    <Panel label="C · Telemetry">
      <div className="mt-4 readout leading-loose text-faint">
        <ReadoutRow
          label="Workers"
          value={
            pool.mode === 'workers'
              ? `${pool.size} · ${pool.busy} busy`
              : `Main thread · ${pool.busy} busy`
          }
        />
        <ReadoutRow
          label="Network"
          value={online ? 'Online' : 'Offline'}
          className={online ? '' : 'text-egress'}
        />
        <ReadoutRow label="File uploads" value="None" className="text-local" />
        <ReadoutRow
          label="Off-origin req"
          value={offOrigin}
          className={offOrigin ? 'text-egress' : 'text-local'}
        />
      </div>
    </Panel>
  )
}

export function Home() {
  useDocumentMeta(PAGE_SEO['/console'])

  return (
    <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <DirectoryPanel />
      {/* its own column, so the long tool list cannot stretch the rows beside it */}
      <div className="flex flex-col gap-3.5 xl:sticky xl:top-3.5">
        <IntakePanel />
        <TelemetryPanel />
      </div>
    </div>
  )
}
