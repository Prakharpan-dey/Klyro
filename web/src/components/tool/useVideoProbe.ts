import { useEffect, useState } from 'react'
import { probeCapability, type VideoCapability } from '@/ops/video/engine'
import { probeVideo, type VideoProbe } from '@/ops/video/probe'

/**
 * Reads the staged video and asks the browser whether it can encode at all,
 * so a tool can say what will happen before anyone waits for it.
 */

export interface VideoState {
  probe?: VideoProbe
  capability?: VideoCapability
  error?: string
  loading: boolean
}

export function useVideoProbe(file: File | undefined): VideoState {
  const [state, setState] = useState<{ for?: File; probe?: VideoProbe; error?: string }>({})
  const [capability, setCapability] = useState<VideoCapability>()

  useEffect(() => {
    let cancelled = false
    probeCapability().then((found) => !cancelled && setCapability(found))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!file) return
    let cancelled = false
    probeVideo(file)
      .then((probe) => !cancelled && setState({ for: file, probe }))
      .catch(() => {
        if (!cancelled) setState({ for: file, error: 'This file could not be read as a video' })
      })
    return () => {
      cancelled = true
    }
  }, [file])

  const current = state.for === file ? state : {}
  return {
    probe: current.probe,
    capability,
    error: current.error,
    loading: Boolean(file) && !current.probe && !current.error,
  }
}
