import { Link, NavLink } from 'react-router'
import { CoffeeIcon } from '@phosphor-icons/react'
import { SUPPORT_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

export function Logo({ to = '/console' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-[13px] py-1.5 text-foreground hover:text-foreground"
    >
      <span className="size-4 border border-primary bg-primary/25" aria-hidden />
      <span className="text-[12.5px] leading-none font-semibold tracking-[0.22em]">KLYRO</span>
      {/* decorative, and the first thing to go: the nav needs the room below lg */}
      <span className="hidden text-[10px] leading-none tracking-[0.14em] whitespace-nowrap text-dim lg:inline">
        FILE APPARATUS · v{__APP_VERSION__}
      </span>
    </Link>
  )
}

/* 11px type leaves a 11px box, so the padding is what carries these to the 24px
   minimum target size rather than the text. */
const hit = 'inline-flex items-center px-1.5 py-[7px]'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(hit, 'text-faint hover:text-foreground', isActive && 'text-foreground')

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-line bg-card px-[18px]">
      <Logo />
      <nav className="flex items-center gap-2.5 text-[11px] leading-none tracking-[0.1em]">
        {/* on a phone there is no rail and no Ctrl-K, so this is the way in */}
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(hit, 'text-faint hover:text-foreground')}
        >
          TOOLS
        </button>
        <NavLink to="/privacy" className={navClass}>
          PRIVACY
        </NavLink>
        {/* a link, not a request: nothing is fetched until someone clicks */}
        {SUPPORT_URL && (
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(hit, 'gap-1.5 text-faint hover:text-foreground')}
            title="Buy me a coffee"
          >
            <CoffeeIcon className="size-[15px]" weight="regular" aria-hidden />
            <span className="hidden sm:inline">BUY ME A COFFEE</span>
            <span className="sr-only sm:hidden">Buy me a coffee</span>
          </a>
        )}
        <button
          type="button"
          onClick={onOpenPalette}
          className="inline-flex items-center border border-line-strong px-[7px] py-[6px] text-primary-hover transition-colors hover:border-primary"
          aria-label="Open command palette"
        >
          {isMac ? '⌘K' : 'CTRL K'}
        </button>
      </nav>
    </header>
  )
}
