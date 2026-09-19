import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { cn } from '@/lib/utils'

export function StatusBar() {
  const { offOrigin, online } = useTelemetry()
  return (
    <footer className="sticky bottom-0 z-20 flex min-h-9 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-card px-[18px] py-2 text-[10.5px] leading-none tracking-[0.1em] text-faint uppercase">
      <div className="flex items-center gap-[9px]">
        <span className="size-[7px] bg-local" aria-hidden />
        <span>Egress · 0 B file data · all processing local</span>
      </div>
      <div className="flex items-center gap-4 text-dim">
        <span className={cn(offOrigin > 0 && 'text-egress')}>Off-origin requests {offOrigin}</span>
        <span className={online ? 'text-dim' : 'text-egress'}>{online ? 'Online' : 'Offline'}</span>
      </div>
    </footer>
  )
}
