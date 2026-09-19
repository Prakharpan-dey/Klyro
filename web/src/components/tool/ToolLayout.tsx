import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Dropzone } from '@/components/console/Dropzone'
import { describeMeta } from '@/components/console/describeMeta'
import { FileRow } from '@/components/console/FileRow'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatBytes, formatDuration } from '@/lib/format'
import type { useFileJob } from '@/lib/useFileJob'
import type { ToolMeta } from '@/tools/types'
import { ResultList } from './ResultList'
import { SortableFileList } from './SortableFileList'
import type { useToolFiles } from './useToolFiles'

interface ToolLayoutProps {
  meta: ToolMeta
  files: ReturnType<typeof useToolFiles>
  job: ReturnType<typeof useFileJob>
  settings: ReactNode
  runLabel: string
  onRun: () => void
  canRun?: boolean
  footnote?: ReactNode
  /** let the user drag files into order (merge, images to PDF) */
  sortable?: boolean
  /** hint under the intake list */
  intakeHint?: string
  /** full-width panel between settings and output, e.g. a page grid */
  workbench?: ReactNode
  compareSizes?: boolean
  /** show a stop button; only long jobs pass an abort signal through */
  cancellable?: boolean
  /** override when a workbench contributes more than one lettered panel */
  outputLabel?: string
}

export function ToolLayout({
  meta,
  files,
  job,
  settings,
  runLabel,
  onRun,
  canRun = true,
  footnote,
  sortable = false,
  intakeHint,
  workbench,
  compareSizes = true,
  cancellable = false,
  outputLabel,
}: ToolLayoutProps) {
  const running = job.status === 'running'
  const pct = job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0
  const totalSize = files.list.reduce((n, f) => n + f.size, 0)

  // one long file reads better as a percentage than as "0 / 1"
  const single = job.total === 1
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => setNow(performance.now()), 1000)
    return () => clearInterval(tick)
  }, [running])

  const elapsed = job.startedAt && now ? now - job.startedAt : 0
  const remaining = single && job.done > 0.03 ? (elapsed * (1 - job.done)) / job.done : 0

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-l border-line pl-5">
        <Link to="/console" className="readout text-[10px] text-dim hover:text-foreground">
          ← Console
        </Link>
        <span className="bg-primary px-[7px] py-1 text-[10px] leading-none font-semibold text-primary-foreground">
          {meta.code}
        </span>
        <h1 className="font-sans text-[26px] leading-tight font-medium tracking-[-0.025em] text-foreground">
          {meta.title}
        </h1>
        <p className="w-full font-sans text-sm text-soft">{meta.summary}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          label="A · Intake"
          className="flex flex-col self-stretch"
          meta={
            files.files.length ? (
              <button
                type="button"
                onClick={files.clear}
                className="text-local hover:text-foreground"
              >
                {files.files.length} staged · {formatBytes(totalSize)} · clear
              </button>
            ) : (
              <span className="text-dim">Empty</span>
            )
          }
        >
          {files.files.length > 0 && (
            <div className="mt-3.5 max-h-[420px] overflow-y-auto">
              {sortable ? (
                <SortableFileList
                  files={files.files}
                  onMove={files.move}
                  onRemove={files.remove}
                  disabled={running}
                />
              ) : (
                <div className="flex flex-col gap-[7px]">
                  {files.files.map((f) => (
                    <FileRow
                      key={f.id}
                      file={f.file}
                      detail={describeMeta(f.meta, f.file.size)}
                      onRemove={running ? undefined : () => files.remove(f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <Dropzone
            onFiles={files.add}
            accept={meta.accept}
            multiple={meta.multiple}
            hint={intakeHint}
            className="mt-[11px] flex-1"
          />
          {files.rejected > 0 && (
            <p className="mt-2 readout text-[10px] text-egress">
              {files.rejected} file{files.rejected === 1 ? '' : 's'} skipped · wrong type for this
              tool
            </p>
          )}
        </Panel>

        <Panel label="B · Settings" className="flex flex-col gap-5 self-stretch">
          <div className="flex flex-col gap-5">{settings}</div>
          <div className="mt-auto flex flex-col gap-3">
            {footnote && (
              <div className="readout text-[10px] leading-relaxed text-local">{footnote}</div>
            )}
            <Button
              onClick={onRun}
              disabled={running || !files.files.length || !canRun}
              className="h-auto py-3 text-[11.5px] font-semibold tracking-[0.12em]"
            >
              {running ? 'RUNNING…' : runLabel}
            </Button>
          </div>
        </Panel>
      </div>

      {workbench}

      <Panel
        label={outputLabel ?? (workbench ? 'D · Output' : 'C · Output')}
        tone="deep"
        meta={
          job.status === 'done' ? (
            <span className="text-local">
              Done · {((job.elapsedMs ?? 0) / 1000).toFixed(1)}s · local
            </span>
          ) : job.status === 'running' ? (
            <span className="text-primary">Running</span>
          ) : job.status === 'error' ? (
            <span className="text-destructive">Error</span>
          ) : job.status === 'cancelled' ? (
            <span className="text-egress">Stopped</span>
          ) : (
            <span className="text-dim">Idle</span>
          )
        }
      >
        {running && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[26px] leading-none font-medium">
                {single ? `${pct}%` : `${Math.floor(job.done)} / ${job.total}`}
              </div>
              {cancellable && (
                <Button
                  variant="outline"
                  onClick={job.cancel}
                  className="h-auto px-3 py-1.5 text-[10.5px] tracking-[0.12em]"
                >
                  STOP
                </Button>
              )}
            </div>
            <Progress value={pct} className="mt-3 h-1.5 bg-line-soft" />
            <div className="mt-3 readout text-faint">
              <ReadoutRow label="Current" value={job.label} className="truncate normal-case" />
              {remaining > 2000 && (
                <ReadoutRow label="Left" value={`about ${formatDuration(remaining / 1000)}`} />
              )}
            </div>
          </div>
        )}
        {job.status === 'cancelled' && (
          <p className="mt-3 font-sans text-[12.5px] text-soft">Stopped. Nothing was saved.</p>
        )}
        {job.status === 'error' && <p className="mt-3 text-sm text-destructive">{job.error}</p>}
        {job.status === 'idle' && (
          <p className="mt-3.5 font-sans text-[12.5px] text-faint">
            Results appear here. Nothing is saved until you press save.
          </p>
        )}
        {job.status === 'done' && (
          <ResultList
            results={job.results}
            zipName={`klyro-${meta.slug}.zip`}
            compareSizes={compareSizes}
          />
        )}
      </Panel>
    </div>
  )
}
