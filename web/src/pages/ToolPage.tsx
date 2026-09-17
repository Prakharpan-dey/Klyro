import { Suspense } from 'react'
import { useParams } from 'react-router'
import { findTool } from '@/tools/registry'
import { NotFound } from './NotFound'

export function ToolPage() {
  const { slug } = useParams()
  const tool = findTool(slug)
  if (!tool) return <NotFound />

  return (
    <Suspense fallback={<p className="readout p-6 text-dim">Loading {tool.title}…</p>}>
      {/* key resets tool state when switching between tools */}
      <tool.Component key={tool.slug} />
    </Suspense>
  )
}
