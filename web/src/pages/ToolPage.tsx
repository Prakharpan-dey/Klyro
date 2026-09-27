import { Suspense } from 'react'
import { useParams } from 'react-router'
import { toolSeo } from '@/lib/seo'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { findTool } from '@/tools/registry'
import { NotFound } from './NotFound'

function ToolView({ tool }: { tool: NonNullable<ReturnType<typeof findTool>> }) {
  useDocumentMeta(toolSeo(tool))

  return (
    <Suspense fallback={<p className="readout p-6 text-dim">Loading {tool.title}…</p>}>
      {/* key resets tool state when switching between tools */}
      <tool.Component key={tool.slug} />
    </Suspense>
  )
}

export function ToolPage() {
  const { slug } = useParams()
  const tool = findTool(slug)
  // the hook must not run for a slug that has no tool, so the branch comes first
  if (!tool) return <NotFound />
  return <ToolView key={tool.slug} tool={tool} />
}
