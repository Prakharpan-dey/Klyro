import { useEffect, useState, useSyncExternalStore } from 'react'
import { poolStore } from '@/ops/image/pool'
import { plannerUrl } from './planner'

function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
  )
}

function isOffOrigin(e: PerformanceEntry) {
  try {
    return new URL(e.name).origin !== location.origin
  } catch {
    return false
  }
}

/** Counts network requests that went to any origin other than this app. */
function useOffOriginRequests() {
  const [count, setCount] = useState(
    () => performance.getEntriesByType('resource').filter(isOffOrigin).length,
  )

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return
    const observer = new PerformanceObserver((list) => {
      const n = list.getEntries().filter(isOffOrigin).length
      if (n) setCount((c) => c + n)
    })
    observer.observe({ type: 'resource', buffered: false })
    return () => observer.disconnect()
  }, [])

  return count
}

export function useTelemetry() {
  const pool = useSyncExternalStore(poolStore.subscribe, poolStore.getSnapshot)
  const online = useOnline()
  const offOrigin = useOffOriginRequests()
  return { pool, online, offOrigin, plannerConnected: Boolean(plannerUrl) }
}
