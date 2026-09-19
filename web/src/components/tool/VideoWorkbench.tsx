import { useEffect, useMemo, useRef } from 'react'
import { Panel, ReadoutRow } from '@/components/console/Panel'
import { formatDuration } from '@/lib/format'
import type { VideoState } from './useVideoProbe'

/**
 * The staged video, playing from memory. The object URL is created and revoked
 * here so a 200 MB clip is not held after you move on.
 */

interface VideoWorkbenchProps {
  file: File | undefined
  state: VideoState
  /** called as the preview plays, so a trim tool can follow along */
  onTime?: (seconds: number) => void
  videoRef?: React.RefObject<HTMLVideoElement | null>
  children?: React.ReactNode
}

export function VideoWorkbench({ file, state, onTime, videoRef, children }: VideoWorkbenchProps) {
  const own = useRef<HTMLVideoElement>(null)
  const element = videoRef ?? own
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])

  // a clip can be hundreds of megabytes, so the handle goes as soon as it changes
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const probe = state.probe

  return (
    <Panel
      label="C · Preview"
      tone="deep"
      meta={
        state.error ? (
          <span className="text-destructive">{state.error}</span>
        ) : probe ? (
          <span className={probe.canDecodeVideo ? 'text-local' : 'text-egress'}>
            {probe.canDecodeVideo ? 'Readable here' : 'This browser cannot decode it'}
          </span>
        ) : (
          <span className="text-dim">{file ? 'Reading…' : 'Nothing staged'}</span>
        )
      }
    >
      <div className="mt-3.5 grid grid-cols-1 items-start gap-3.5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="border border-line-soft bg-well p-2">
          {url ? (
            <video
              ref={element}
              src={url}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
              className="max-h-[340px] w-full bg-black"
            />
          ) : (
            <p className="p-6 text-center font-sans text-[12.5px] text-faint">
              Drop a video to see it here. It plays from this tab; nothing is uploaded.
            </p>
          )}
        </div>

        <div className="readout text-faint">
          {probe && (
            <>
              <ReadoutRow label="Length" value={formatDuration(probe.durationSec)} />
              <ReadoutRow
                label="Size"
                value={probe.width && probe.height ? `${probe.width}×${probe.height}` : 'unknown'}
              />
              <ReadoutRow label="Video" value={probe.videoCodec ?? 'none'} />
              <ReadoutRow label="Audio" value={probe.audioCodec ?? 'none'} />
            </>
          )}
          {children}
        </div>
      </div>
    </Panel>
  )
}
