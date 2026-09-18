export type ToolCategory = 'image' | 'pdf'

/** Section shown in the tool index; tools within a group share a workflow. */
export type ToolGroup = 'Image' | 'Pages' | 'Stamps' | 'Convert' | 'Inspect' | 'Secure'

export interface ToolMeta {
  slug: string
  /** short index code shown in the console, e.g. IMG-01 */
  code: string
  title: string
  summary: string
  category: ToolCategory
  group: ToolGroup
  /** mime types, `image/*` style wildcards allowed */
  accept: string[]
  multiple: boolean
}

export const PDF_ACCEPT = ['application/pdf']
export const IMAGE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/avif',
  'image/gif',
]
