export type ToolCategory = 'image' | 'pdf'

export interface ToolMeta {
  slug: string
  /** short index code shown in the console, e.g. IMG-01 */
  code: string
  title: string
  summary: string
  category: ToolCategory
  /** mime types, `image/*` style wildcards allowed */
  accept: string[]
  multiple: boolean
}
