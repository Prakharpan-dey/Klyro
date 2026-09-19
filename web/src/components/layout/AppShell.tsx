import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CommandPalette } from './CommandPalette'
import { StatusBar } from './StatusBar'
import { ToolNav } from './ToolNav'
import { TopBar } from './TopBar'

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-8 lg:px-11">
      <div className="mx-auto flex max-w-[1280px] flex-col border border-line bg-[#070c16] shadow-[0_24px_70px_rgba(0,0,0,.6)]">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <div className="flex min-h-0 flex-1">
          <ToolNav />
          {/* min-w-0 keeps the tool grids from pushing the console wider than its frame */}
          <main className="min-w-0 flex-1 p-3 sm:p-[22px]">
            <Outlet />
          </main>
        </div>
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
