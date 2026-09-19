import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { SUPPORT_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

export function StatusBar() {
  const { offOrigin, online } = useTelemetry()
  return (
    <footer className="flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-card px-[18px] py-2 text-[10.5px] leading-none tracking-[0.1em] text-faint uppercase">
      <div className="flex items-center gap-[9px]">
        <span className="size-[7px] bg-local" aria-hidden />
        <span>Egress · 0 B file data · all processing local</span>
      </div>
      <div className="flex items-center gap-4 text-dim">
        {/* a link, not a request: nothing is fetched until someone clicks */}
        {SUPPORT_URL && (
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="text-dim hover:text-foreground"
          >
            Buy me a coffee
          </a>
        )}
        <span className={cn(offOrigin > 0 && 'text-egress')}>Off-origin requests {offOrigin}</span>
        <span className={online ? 'text-dim' : 'text-egress'}>{online ? 'Online' : 'Offline'}</span>
      </div>
    </footer>
  )
}
