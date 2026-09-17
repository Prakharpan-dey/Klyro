import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Dropzone } from '@/components/console/Dropzone'
import { describeMeta } from '@/components/console/describeMeta'
import { FileRow } from '@/components/console/FileRow'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { tools } from '@/tools/registry'

const examples = ['Compress to 200 KB', 'Merge + drop page 2', 'All → WebP']

function InstructionPanel() {
  const [text, setText] = useState('')
  const { plannerConnected } = useTelemetry()

  const submit = (e: FormEvent) => {
    e.preventDefault()
  }

  return (
    <Panel label="A · Instruction" tone="deep" className="px-6 py-[26px] [grid-area:a]">
      <h1 className="mt-4 font-sans text-[30px] leading-[1.06] font-medium tracking-[-0.035em] text-foreground sm:text-[38px]">
        Your files never
        <br />
        leave this tab.
      </h1>
      <p className="mt-3.5 max-w-[46ch] font-sans text-[14.5px] leading-relaxed text-pretty text-soft">
        Compress, resize, convert, merge, split and strip EXIF — every byte is processed on this
        machine. Describe the job; only that sentence and the file sizes are sent for planning.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 flex items-stretch border border-primary bg-[#060d19] shadow-[0_0_0_3px_rgba(77,184,255,.1)] focus-within:shadow-[0_0_0_3px_rgba(77,184,255,.25)]"
      >
        <span className="flex items-center border-r border-line bg-primary/15 px-[13px] text-[13px] font-semibold text-primary">
          ›
        </span>
        <label htmlFor="instruction" className="sr-only">
          Describe what to do with your files
        </label>
        <input
          id="instruction"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="merge these, remove page 3, under 500 KB"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-4 text-sm text-foreground caret-primary outline-none placeholder:text-faint"
        />
        <Button
          type="submit"
          disabled={!plannerConnected || !text.trim()}
          className="h-auto px-5 text-[11.5px] font-semibold tracking-[0.12em]"
        >
          PLAN →
        </Button>
      </form>

      <div className="mt-[11px] flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setText(ex.toLowerCase())}
            className="border border-line px-[11px] py-2 text-[11px] leading-none tracking-[0.06em] text-soft uppercase transition-colors hover:border-primary hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {!plannerConnected && (
        <p className="mt-4 readout text-[10px] text-egress">
          Planner not connected · the tools below work without it
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
      className="flex flex-col self-stretch [grid-area:b]"
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
        <div className="mt-3.5 flex flex-col gap-[7px]">
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
        className="mt-[11px] flex-1"
        hint="Staged files stay in this tab's memory and are gone when you close it."
      />
    </Panel>
  )
}

function PlanPanel() {
  return (
    <Panel
      label="C · Plan"
      className="[grid-area:c]"
      meta={<span className="text-dim">/plan · idle</span>}
    >
      <div className="mt-3.5 border border-line-soft bg-well px-3 py-5 font-sans text-[12.5px] leading-relaxed text-soft">
        No plan yet. Describe a job in <span className="text-primary">A</span> and every step will
        be listed here — marked <span className="font-mono text-local">LOCAL</span> — before
        anything runs.
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          disabled
          className="h-auto flex-1 py-3 text-[11.5px] font-semibold tracking-[0.12em]"
        >
          RUN
        </Button>
        <Button
          disabled
          variant="outline"
          className="h-auto px-4 py-3 text-[11.5px] tracking-[0.12em] text-soft"
        >
          EDIT
        </Button>
      </div>
    </Panel>
  )
}

function RunPanel() {
  return (
    <Panel label="D · Run" className="[grid-area:d]">
      <div className="mt-4 text-[26px] leading-none font-medium text-foreground">0 / 0</div>
      <Progress value={0} className="mt-3 h-1.5 bg-line-soft" />
      <div className="mt-3.5 readout leading-[1.9] text-faint">
        <ReadoutRow label="Status" value="Idle" className="text-dim" />
      </div>
    </Panel>
  )
}

function TelemetryPanel() {
  const { pool, online, offOrigin, plannerConnected } = useTelemetry()
  return (
    <Panel label="E · Telemetry" className="[grid-area:e]">
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
        <ReadoutRow
          label="Planner"
          value={plannerConnected ? '/plan only' : 'Not connected'}
          className="text-egress"
        />
      </div>
    </Panel>
  )
}

function ToolIndexPanel() {
  return (
    <Panel
      id="tools"
      label="F · Tool index"
      tone="deep"
      className="scroll-mt-6 [grid-area:f]"
      meta={<span className="text-primary">All {tools.length}</span>}
    >
      <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px border border-line-soft bg-line-soft">
        {tools.map((t) => (
          <Link
            key={t.slug}
            to={`/tools/${t.slug}`}
            className="group bg-well px-4 py-[15px] transition-colors hover:bg-accent"
          >
            <div className="text-[9.5px] leading-none tracking-[0.14em] text-primary">{t.code}</div>
            <div className="mt-[9px] font-sans text-[13.5px] leading-tight font-medium text-foreground">
              {t.title}
            </div>
            <div className="mt-[5px] font-sans text-[11.5px] leading-normal text-faint group-hover:text-soft">
              {t.summary}
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  )
}

export function Home() {
  return (
    <div className="grid grid-cols-1 items-start gap-3.5 [grid-template-areas:'a'_'b'_'c'_'d'_'e'_'f'] md:grid-cols-2 md:[grid-template-areas:'a_a'_'b_b'_'c_c'_'d_e'_'f_f'] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:[grid-template-areas:'a_b'_'c_b'_'d_e'_'f_f']">
      <InstructionPanel />
      <IntakePanel />
      <PlanPanel />
      <RunPanel />
      <TelemetryPanel />
      <ToolIndexPanel />
    </div>
  )
}
