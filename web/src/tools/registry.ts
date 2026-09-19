import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ToolGroup, ToolMeta } from './types'

export interface Tool extends ToolMeta {
  Component: LazyExoticComponent<ComponentType>
}

// Each tool folder registers itself with a meta.ts and a Tool.tsx.
const metas = import.meta.glob<ToolMeta>('./*/meta.ts', { eager: true, import: 'meta' })
const loaders = import.meta.glob<{ default: ComponentType }>('./*/Tool.tsx')

export const tools: Tool[] = Object.entries(metas)
  .map(([path, meta]) => {
    const load = loaders[path.replace('meta.ts', 'Tool.tsx')]
    return { ...meta, Component: lazy(load) }
  })
  .sort((a, b) => a.code.localeCompare(b.code))

export function findTool(slug: string | undefined): Tool | undefined {
  return tools.find((t) => t.slug === slug)
}

export const categoryLabel: Record<ToolMeta['category'], string> = {
  image: 'Image',
  pdf: 'PDF',
  video: 'Video',
}

/** Tools by section, in the order the index shows them. */
export const toolGroups: { group: ToolGroup; tools: Tool[] }[] = (
  ['Image', 'Video', 'Pages', 'Stamps', 'Optimise', 'Convert', 'Inspect', 'Secure'] as ToolGroup[]
)
  .map((group) => ({ group, tools: tools.filter((t) => t.group === group) }))
  .filter((section) => section.tools.length > 0)
