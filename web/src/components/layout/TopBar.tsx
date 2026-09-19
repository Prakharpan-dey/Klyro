import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-[13px] text-foreground hover:text-foreground">
      <span className="size-4 border border-primary bg-primary/25" aria-hidden />
      <span className="text-[12.5px] leading-none font-semibold tracking-[0.22em]">KLYRO</span>
      <span className="hidden text-[10px] leading-none tracking-[0.14em] whitespace-nowrap text-dim sm:inline">
        FILE APPARATUS · v{__APP_VERSION__}
      </span>
    </Link>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('text-faint hover:text-foreground', isActive && 'text-foreground')

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <header className="flex h-11 items-center justify-between border-b border-line bg-card px-[18px]">
      <Logo />
      <nav className="flex items-center gap-[18px] text-[11px] leading-none tracking-[0.1em]">
        {/* on a phone there is no rail and no Ctrl-K, so this is the way in */}
        <button type="button" onClick={onOpenPalette} className="text-faint hover:text-foreground">
          TOOLS
        </button>
        <NavLink to="/privacy" className={navClass}>
          PRIVACY
        </NavLink>
        <button
          type="button"
          onClick={onOpenPalette}
          className="border border-line px-[7px] py-[5px] text-[#9ad6ff] transition-colors hover:border-primary"
          aria-label="Open command palette"
        >
          {isMac ? '⌘K' : 'CTRL K'}
        </button>
      </nav>
    </header>
  )
}
