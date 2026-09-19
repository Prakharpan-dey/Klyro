export type ToolCategory = 'image' | 'pdf' | 'video'

/** Section shown in the tool index; tools within a group share a workflow. */
export type ToolGroup =
  'Image' | 'Video' | 'Pages' | 'Stamps' | 'Optimise' | 'Convert' | 'Inspect' | 'Secure'

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
export const VIDEO_ACCEPT = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-m4v',
]
export const SHEET_ACCEPT = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
export const IMAGE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/avif',
  'image/gif',
]
