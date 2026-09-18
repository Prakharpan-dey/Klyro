import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link } from 'react-router'
import { Dropzone } from '@/components/console/Dropzone'
import { describeMeta } from '@/components/console/describeMeta'
import { FileRow } from '@/components/console/FileRow'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { ResultList } from '@/components/tool/ResultList'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { usePlanner } from '@/features/planner/usePlanner'
import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { formatBytes } from '@/lib/format'
import { describeStep } from '@/lib/plan/describe'
import type { StepProgress } from '@/lib/plan/execute'
import { cn } from '@/lib/utils'
import { tools } from '@/tools/registry'

type Planner = ReturnType<typeof usePlanner>

const examples = ['Compress to 200 KB', 'Merge + drop page 2', 'All → WebP']

function InstructionPanel({
  planner,
  inputRef,
}: {
  planner: Planner
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const [text, setText] = useState('')
  const [shareNames, setShareNames] = useState(false)
  const { plannerConnected } = useTelemetry()
  const { files } = useWorkspace()

  const planning = planner.phase === 'planning'
  const running = planner.phase === 'running'
  const pendingMeta = files.some((f) => !f.meta)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || planning || running) return
    planner.submit(text, files, shareNames)
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
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="merge these, remove page 3, under 500 KB"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-4 text-sm text-foreground caret-primary outline-none placeholder:text-faint"
        />
        <Button
          type="submit"
          disabled={!plannerConnected || !text.trim() || planning || running || pendingMeta}
          className="h-auto px-5 text-[11.5px] font-semibold tracking-[0.12em]"
        >
          {planning ? 'PLANNING…' : 'PLAN →'}
        </Button>
      </form>

      <div className="mt-[11px] flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setText(ex.toLowerCase())
              inputRef.current?.focus()
            }}
            className="border border-line px-[11px] py-2 text-[11px] leading-none tracking-[0.06em] text-soft uppercase transition-colors hover:border-primary hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Switch id="share-names" size="sm" checked={shareNames} onCheckedChange={setShareNames} />
          <Label htmlFor="share-names" className="readout text-[10px] text-dim">
            Share file names with the planner
          </Label>
        </div>
        {!plannerConnected && (
          <span className="readout text-[10px] text-egress">Planner not connected</span>
        )}
        {plannerConnected && !files.length && (
          <span className="readout text-[10px] text-faint">Stage files in B first</span>
        )}
      </div>
    </Panel>
  )
}

function IntakePanel({ locked }: { locked: boolean }) {
  const { files, add, remove, clear } = useWorkspace()
  return (
    <Panel
      label="B · Intake"
      className="flex flex-col self-stretch [grid-area:b]"
      meta={
        files.length ? (
          <button
            type="button"
            onClick={clear}
            disabled={locked}
            className="text-local hover:text-foreground disabled:opacity-50"
          >
            {files.length} staged · clear
          </button>
        ) : (
          <span className="text-dim">Empty</span>
        )
      }
    >
      {files.length > 0 && (
        <div className="mt-3.5 flex max-h-[380px] flex-col gap-[7px] overflow-y-auto">
          {files.map((f, i) => (
            <div key={f.id} className="flex items-stretch">
              <span className="flex w-9 shrink-0 items-center justify-center border border-r-0 border-line-soft bg-well text-[10px] text-primary">
                {String(i).padStart(2, '0')}
              </span>
              <FileRow
                file={f.file}
                detail={describeMeta(f.meta, f.file.size)}
                onRemove={locked ? undefined : () => remove(f.id)}
                className="flex-1"
              />
            </div>
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

function PlanPanel({ planner, onEdit }: { planner: Planner; onEdit: () => void }) {
  const { files } = useWorkspace()
  const { phase, plan, bytesSent, mode, error } = planner
  const names = planner.files.map((f) => f.name)

  // the plan refers to files by position, so any change to the staged list makes it stale
  const stale =
    Boolean(plan) &&
    (files.length !== planner.files.length || files.some((f, i) => f.file !== planner.files[i]))
  const canRun = phase === 'planned' && Boolean(plan?.steps.length) && !stale

  const meta =
    phase === 'planning' ? (
      <span className="text-egress">● /plan · sending</span>
    ) : bytesSent ? (
      <span className="text-egress">
        ● /plan · {bytesSent} B sent{mode === 'rules' ? ' · rules' : ''}
      </span>
    ) : (
      <span className="text-dim">/plan · idle</span>
    )

  return (
    <Panel label="C · Plan" className="[grid-area:c]" meta={meta}>
      {phase === 'idle' && (
        <div className="mt-3.5 border border-line-soft bg-well px-3 py-5 font-sans text-[12.5px] leading-relaxed text-soft">
          No plan yet. Describe a job in <span className="text-primary">A</span> and every step will
          be listed here — marked <span className="font-mono text-local">LOCAL</span> — before
          anything runs.
        </div>
      )}

      {phase === 'planning' && (
        <div className="mt-3.5 flex flex-col gap-px border border-line-soft bg-line-soft">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-well px-3 py-[11px]">
              <span className="h-2.5 w-4 animate-pulse bg-line" />
              <span
                className="h-2.5 animate-pulse bg-line-soft"
                style={{ width: `${60 - i * 12}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {phase === 'error' && !plan && (
        <div className="mt-3.5 border border-destructive/40 bg-well px-3 py-4 font-sans text-[12.5px] text-destructive">
          {error}
        </div>
      )}

      {plan && (
        <>
          {plan.summary && (
            <p className="mt-3.5 font-sans text-[13px] leading-relaxed text-foreground">
              {plan.summary}
            </p>
          )}
          {plan.steps.length > 0 && (
            <ol className="mt-3 flex flex-col gap-px border border-line-soft bg-line-soft">
              {plan.steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3 bg-well px-3 py-[11px]">
                  <span className="text-[10px] font-medium text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 font-sans text-[12.5px] leading-snug text-foreground">
                    {describeStep(step, names)}
                  </span>
                  <span className="text-[10px] tracking-[0.08em] text-local">LOCAL</span>
                </li>
              ))}
            </ol>
          )}
          {plan.clarification && (
            <div className="mt-3 border border-egress/40 bg-egress/5 px-3 py-3 font-sans text-[12.5px] leading-relaxed text-egress">
              {plan.clarification}
            </div>
          )}
          {mode === 'rules' && (
            <p className="mt-3 readout text-[10px] text-egress">
              Planned by the API&apos;s keyword rules · the model is unavailable on this account
            </p>
          )}
          {stale && (
            <p className="mt-3 readout text-[10px] text-egress">
              Staged files changed · plan again before running
            </p>
          )}
        </>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          disabled={!canRun}
          onClick={planner.run}
          className="h-auto flex-1 py-3 text-[11.5px] font-semibold tracking-[0.12em]"
        >
          {phase === 'running' ? 'RUNNING…' : 'RUN'}
        </Button>
        <Button
          variant="outline"
          disabled={phase === 'running' || phase === 'planning'}
          onClick={onEdit}
          className="h-auto px-4 py-3 text-[11.5px] tracking-[0.12em] text-soft"
        >
          EDIT
        </Button>
      </div>
    </Panel>
  )
}

const stepStatus: Record<StepProgress['status'], string> = {
  queued: 'text-dim',
  running: 'text-primary',
  done: 'text-local',
  error: 'text-destructive',
}

function RunPanel({ planner }: { planner: Planner }) {
  const { plan, steps, phase, error } = planner
  const total = plan?.steps.length ?? 0
  const done = steps.filter((s) => s?.status === 'done').length
  const showSteps = steps.length > 0 && plan

  return (
    <Panel label="D · Run" className="[grid-area:d]">
      <div className="mt-4 text-[26px] leading-none font-medium text-foreground">
        {showSteps ? done : 0} / {showSteps ? total : 0}
      </div>
      <Progress
        value={total && showSteps ? (done / total) * 100 : 0}
        className="mt-3 h-1.5 bg-line-soft"
      />
      <div className="mt-3.5 readout leading-[1.9] text-faint">
        {showSteps ? (
          plan.steps.map((step, i) => {
            const s = steps[i]
            const label =
              s?.status === 'done'
                ? `Done ${((s.ms ?? 0) / 1000).toFixed(1)}s`
                : s?.status === 'error'
                  ? 'Failed'
                  : (s?.status ?? 'queued')
            return (
              <ReadoutRow
                key={i}
                label={step.op.split('.')[1].replace(/([A-Z])/g, ' $1')}
                value={label}
                className={stepStatus[s?.status ?? 'queued']}
              />
            )
          })
        ) : (
          <ReadoutRow label="Status" value="Idle" className="text-dim" />
        )}
      </div>
      {phase === 'error' && plan && error && (
        <p className="mt-2 font-sans text-[12px] text-destructive">{error}</p>
      )}
    </Panel>
  )
}

function TelemetryPanel({ planner }: { planner: Planner }) {
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
          value={
            !plannerConnected
              ? 'Not connected'
              : planner.bytesSent
                ? `/plan · ${formatBytes(planner.bytesSent)}`
                : '/plan only'
          }
          className="text-egress"
        />
      </div>
    </Panel>
  )
}

function OutputPanel({ planner }: { planner: Planner }) {
  return (
    <Panel
      label="G · Output"
      tone="deep"
      className="[grid-area:g]"
      meta={
        <span className="text-local">
          Done · {((planner.elapsedMs ?? 0) / 1000).toFixed(1)}s · local
        </span>
      }
    >
      <ResultList results={planner.results} zipName="klyro-output.zip" compareSizes={false} />
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
  const planner = usePlanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const hasOutput = planner.phase === 'done' && planner.results.length > 0

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
        hasOutput
          ? "[grid-template-areas:'a'_'b'_'c'_'d'_'g'_'e'_'f'] md:[grid-template-areas:'a_a'_'b_b'_'c_c'_'d_e'_'g_g'_'f_f'] lg:[grid-template-areas:'a_b'_'c_b'_'d_e'_'g_g'_'f_f']"
          : "[grid-template-areas:'a'_'b'_'c'_'d'_'e'_'f'] md:[grid-template-areas:'a_a'_'b_b'_'c_c'_'d_e'_'f_f'] lg:[grid-template-areas:'a_b'_'c_b'_'d_e'_'f_f']",
      )}
    >
      <InstructionPanel planner={planner} inputRef={inputRef} />
      <IntakePanel locked={planner.phase === 'running'} />
      <PlanPanel planner={planner} onEdit={() => inputRef.current?.focus()} />
      <RunPanel planner={planner} />
      <TelemetryPanel planner={planner} />
      {hasOutput && <OutputPanel planner={planner} />}
      <ToolIndexPanel />
    </div>
  )
}
