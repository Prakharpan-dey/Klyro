import { useEffect, useRef, useState } from 'react'
import { CameraIcon, TrashIcon } from '@phosphor-icons/react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { useFileJob } from '@/lib/useFileJob'
import { imagesToPdf, type PageSize } from '@/ops/pdf/fromImages'
import { meta } from './meta'

export default function ScanToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const job = useFileJob()
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string>()
  const [pageSize, setPageSize] = useState<PageSize>('a4')

  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setLive(false)
  }

  useEffect(() => stop, [])

  const start = async () => {
    setError(undefined)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 2560 }, height: { ideal: 1440 } },
        audio: false,
      })
      stream.current = media
      if (video.current) {
        video.current.srcObject = media
        await video.current.play()
      }
      setLive(true)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was refused. You can still drop photos below.'
          : 'No camera available on this device. You can still drop photos below.',
      )
    }
  }

  const capture = async () => {
    const source = video.current
    if (!source) return
    const canvas = document.createElement('canvas')
    canvas.width = source.videoWidth
    canvas.height = source.videoHeight
    canvas.getContext('2d')?.drawImage(source, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
    canvas.width = 0
    canvas.height = 0
    if (!blob) return
    const page = files.files.length + 1
    files.add([
      new File([blob], `page-${String(page).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }),
    ])
  }

  const run = () =>
    job.run(async (progress) => {
      const out = await imagesToPdf(
        files.list,
        { pageSize, orientation: 'auto', marginMm: pageSize === 'fit' ? 0 : 8, name: 'scan' },
        progress,
      )
      return [out]
    })

  const workbench = (
    <Panel
      label="C · Camera"
      tone="deep"
      meta={
        live ? (
          <span className="text-local">Live</span>
        ) : (
          <span className="text-dim">{error ? 'Unavailable' : 'Off'}</span>
        )
      }
    >
      <div className="mt-3.5 flex flex-col gap-3">
        <div className="relative overflow-hidden border border-line-soft bg-[#0b1526]">
          <video
            ref={video}
            playsInline
            muted
            className="mx-auto max-h-[46vh] w-full object-contain"
          />
          {!live && (
            <div className="absolute inset-0 flex items-center justify-center readout text-[11px] text-faint">
              {error ?? 'Camera is off'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {live ? (
            <>
              <Button onClick={capture} className="tracking-[0.1em]">
                <CameraIcon data-icon="inline-start" />
                CAPTURE PAGE
              </Button>
              <Button variant="outline" onClick={stop} className="tracking-[0.1em]">
                STOP CAMERA
              </Button>
            </>
          ) : (
            <Button onClick={start} className="tracking-[0.1em]">
              <CameraIcon data-icon="inline-start" />
              START CAMERA
            </Button>
          )}
          {files.files.length > 0 && (
            <Button
              variant="ghost"
              onClick={files.clear}
              className="ml-auto text-faint tracking-[0.1em]"
            >
              <TrashIcon data-icon="inline-start" />
              CLEAR PAGES
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      sortable
      workbench={workbench}
      intakeHint="Captured pages land here. You can also drop photos you already have."
      runLabel="MAKE PDF"
      onRun={run}
      canRun={files.files.length > 0}
      footnote={
        files.files.length
          ? `${files.files.length} page(s) ready`
          : 'Capture or drop at least one page'
      }
      settings={
        <>
          <Field label="Page size">
            <Segmented
              label="Page size"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
                { value: 'fit', label: 'Fit photo' },
              ]}
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Photos stay in this tab and are never uploaded. The camera stops as soon as you leave
            the page.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Hold the page flat, fill the frame, and capture each sheet in order. Drag to reorder if
            needed.
          </p>
        </>
      }
    />
  )
}
