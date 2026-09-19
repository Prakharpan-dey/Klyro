import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceContext'
import { Home } from '@/pages/Home'
import { Landing } from '@/pages/Landing'
import { NotFound } from '@/pages/NotFound'
import { Privacy } from '@/pages/Privacy'
import { ToolPage } from '@/pages/ToolPage'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <WorkspaceProvider>
          <Routes>
            <Route index element={<Landing />} />
            <Route element={<AppShell />}>
              <Route path="console" element={<Home />} />
              <Route path="tools/:slug" element={<ToolPage />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster position="bottom-right" />
        </WorkspaceProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
