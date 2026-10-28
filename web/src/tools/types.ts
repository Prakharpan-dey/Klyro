export type ToolCategory = 'image' | 'pdf' | 'video'

/** Section shown in the tool index; tools within a group share a workflow. */
export type ToolGroup =
  'Image' | 'Video' | 'Pages' | 'Stamps' | 'Optimise' | 'Convert' | 'Inspect' | 'Secure'

/**
 * What a search engine and a link preview see.
 *
 * Deliberately separate from `title` and `summary`: the rail needs "Merge"
 * under a PDF heading, a search result needs "Merge PDF". Same tool, different
 * readers, and collapsing them makes one of the two worse.
 */
export interface ToolSeo {
  /** page title, under 60 characters, head term first */
  title: string
  /** meta description, 150-160 characters, carrying the long-tail phrasing */
  description: string
  /** ~60 words: when you would reach for this, and what runs locally */
  about: string
}

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
  seo?: ToolSeo
}

export const PDF_ACCEPT = ['application/pdf']
export const VIDEO_ACCEPT = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-m4v',
]
/** Sound files mediabunny can read; mp3 included, so an MP3 can be trimmed or re-rated. */
export const AUDIO_ACCEPT = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/opus',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
]
export const SHEET_ACCEPT = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]
// Windows labels .csv as application/vnd.ms-excel whenever Excel is installed;
// the reader sniffs the bytes, so taking that label in is safe
export const CSV_ACCEPT = ['text/csv', 'application/vnd.ms-excel']
export const DOCX_ACCEPT = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const ODT_ACCEPT = ['application/vnd.oasis.opendocument.text']
export const ODS_ACCEPT = ['application/vnd.oasis.opendocument.spreadsheet']
export const EPUB_ACCEPT = ['application/epub+zip']
export const ZIP_ACCEPT = ['application/zip', 'application/x-zip-compressed']
export const HTML_ACCEPT = ['text/html', 'application/xhtml+xml']
export const RTF_ACCEPT = ['application/rtf', 'text/rtf']
// kept apart from IMAGE_ACCEPT: the image workers cannot decode SVG
export const SVG_ACCEPT = ['image/svg+xml']
export const IMAGE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/avif',
  'image/gif',
  // iPhone photos; decoded in ops/image/heic.ts where the browser cannot
  'image/heic',
  'image/heif',
]
