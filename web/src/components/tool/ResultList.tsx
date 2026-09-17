import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { saveFile, saveZip } from '@/lib/download'
import { formatBytes, formatSaving } from '@/lib/format'
import type { OutputFile } from '@/ops/types'
import { cn } from '@/lib/utils'

interface ResultListProps {
  results: OutputFile[]
  zipName: string
  /** show before → after sizes; off for tools that change structure rather than shrink files */
  compareSizes?: boolean
}

export function ResultList({ results, zipName, compareSizes = true }: ResultListProps) {
  if (!results.length) return null
  const before = results.reduce((n, r) => n + r.sourceSize, 0)
  const after = results.reduce((n, r) => n + r.file.size, 0)

  return (
    <div className="mt-3.5">
      <div className="flex flex-col gap-px border border-line-soft bg-line-soft">
        {results.map((r, i) => {
          const smaller = r.file.size < r.sourceSize
          return (
            <div
              key={`${r.file.name}-${i}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-well px-3 py-[11px]"
            >
              <span className="text-[10px] font-medium text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate font-sans text-[12.5px] text-foreground"
                  title={r.file.name}
                >
                  {r.file.name}
                </div>
                <div className="readout text-[10px] tracking-[0.06em] text-dim">
                  {compareSizes ? (
                    <>
                      {formatBytes(r.sourceSize)} → {formatBytes(r.file.size)}
                      <span className={cn('ml-2', smaller ? 'text-local' : 'text-egress')}>
                        {formatSaving(r.sourceSize, r.file.size)}
                      </span>
                    </>
                  ) : (
                    formatBytes(r.file.size)
                  )}
                  {r.width && r.height ? ` · ${r.width}×${r.height}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                </div>
                {r.warning && <div className="mt-1 text-[11px] text-egress">{r.warning}</div>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveFile(r.file, r.file.name)}
                className="tracking-[0.1em]"
              >
                <DownloadSimpleIcon data-icon="inline-start" />
                SAVE
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="readout text-[10px] text-faint">
          {results.length} file{results.length === 1 ? '' : 's'} ·{' '}
          {compareSizes && <>{formatBytes(before)} → </>}
          <span className="text-foreground">{formatBytes(after)}</span>
        </span>
        {results.length > 1 && (
          <Button
            onClick={() =>
              saveZip(
                results.map((r) => r.file),
                zipName,
              )
            }
            className="tracking-[0.12em]"
          >
            <DownloadSimpleIcon data-icon="inline-start" />
            SAVE ALL (.ZIP)
          </Button>
        )}
      </div>
    </div>
  )
}
