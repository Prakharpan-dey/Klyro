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
    <div className="flex min-h-dvh flex-col">
      <TopBar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <ToolNav />
        {/* min-w-0 keeps the tool grids from pushing the console wider than the viewport */}
        <main className="min-w-0 flex-1 p-3 sm:p-6">
          {/* the rail already eats the left edge, so the work only needs centring past it */}
          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
      <StatusBar />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
