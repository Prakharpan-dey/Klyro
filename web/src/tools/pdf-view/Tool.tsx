import { useEffect, useRef, useState } from 'react'
import { CaretLeftIcon, CaretRightIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { Dropzone } from '@/components/console/Dropzone'
import { Panel } from '@/components/console/Panel'
import { Button } from '@/components/ui/button'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { closePdf, openPdf, renderPage } from '@/ops/pdf/pdfjs'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meta } from './meta'

export default function ViewPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const holder = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(0)
  const [page, setPage] = useState(0)
  const [zoom, setZoom] = useState(1.2)
  const [error, setError] = useState<string>()
  const file = files.list[0]

  useEffect(() => {
    if (!file) return
    let cancelled = false
    let doc: Awaited<ReturnType<typeof openPdf>> | null = null

    ;(async () => {
      try {
        doc = await openPdf(file)
        if (cancelled) return
        setPageCount(doc.numPages)
        setPage(0)
        setError(undefined)
      } catch {
        if (!cancelled) setError('This file could not be opened as a PDF')
      }
    })()

    return () => {
      cancelled = true
      if (doc) closePdf(doc)
    }
  }, [file])

  // render the current page whenever it, the zoom or the file changes
  useEffect(() => {
    if (!file || !pageCount) return
    let cancelled = false

    ;(async () => {
      const doc = await openPdf(file)
      try {
        const canvas = await renderPage(doc, Math.min(page, doc.numPages - 1), zoom)
        if (cancelled || !holder.current) return
        canvas.className = 'mx-auto max-w-full bg-white shadow-[0_10px_40px_rgba(0,0,0,.5)]'
        holder.current.replaceChildren(canvas)
      } finally {
        await closePdf(doc)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [file, page, zoom, pageCount])

  const step = (delta: number) => setPage((p) => Math.max(0, Math.min(pageCount - 1, p + delta)))

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-l border-line pl-5">
        <span className="bg-primary px-[7px] py-1 text-[10px] leading-none font-semibold text-primary-foreground">
          {meta.code}
        </span>
        <h1 className="font-sans text-[26px] leading-tight font-medium tracking-[-0.025em] text-foreground">
          {meta.title}
        </h1>
        <p className="w-full font-sans text-sm text-soft">{meta.summary}</p>
      </div>

      <Panel
        label="A · Document"
        meta={
          file ? (
            <span className="text-dim">
              {file.name} · {formatBytes(file.size)}
            </span>
          ) : (
            <span className="text-dim">Nothing open</span>
          )
        }
      >
        {!file && (
          <Dropzone
            onFiles={files.add}
            accept={meta.accept}
            multiple={false}
            className="mt-3.5"
            hint="The file is opened in this tab only."
          />
        )}

        {file && (
          <>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => step(-1)}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <CaretLeftIcon />
              </Button>
              <span className="readout min-w-24 text-center text-[11px] text-dim">
                {pageCount ? `${page + 1} / ${pageCount}` : '…'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => step(1)}
                disabled={page + 1 >= pageCount}
                aria-label="Next page"
              >
                <CaretRightIcon />
              </Button>

              <span className="mx-2 h-5 w-px bg-line-soft" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                aria-label="Zoom out"
              >
                <MinusIcon />
              </Button>
              <span className="readout w-14 text-center text-[11px] text-dim">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                aria-label="Zoom in"
              >
                <PlusIcon />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={files.clear}
                className="ml-auto text-faint"
              >
                CLOSE
              </Button>
            </div>

            {error && <p className="mt-3 font-sans text-sm text-destructive">{error}</p>}

            <div
              ref={holder}
              className={cn(
                'mt-3.5 flex max-h-[70vh] items-start justify-center overflow-auto border border-line-soft bg-[#0b1526] p-4',
                !pageCount && 'min-h-40',
              )}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
