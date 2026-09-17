import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CommandPalette } from './CommandPalette'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname, hash } = useLocation()

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
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-8 lg:px-11">
      <div className="mx-auto flex max-w-[1280px] flex-col border border-line bg-[#070c16] shadow-[0_24px_70px_rgba(0,0,0,.6)]">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 p-3 sm:p-[22px]">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
