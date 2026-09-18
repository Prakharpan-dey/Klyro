import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { OutputFile, Progress } from '../types'
import { baseName } from './load'
import { closePdf, openPdf } from './pdfjs'

interface TextItemish {
  str?: string
  transform?: number[]
  hasEOL?: boolean
}

/**
 * Text of one page, with line breaks rebuilt from the vertical position of each
 * run. pdf.js returns positioned fragments, not lines.
 */
export async function extractPageText(doc: PDFDocumentProxy, index: number): Promise<string> {
  const page = await doc.getPage(index + 1)
  const content = await page.getTextContent()
  let text = ''
  let lastY: number | null = null

  for (const item of content.items as TextItemish[]) {
    if (typeof item.str !== 'string') continue
    const y = item.transform?.[5] ?? null
    // transform[3] carries the vertical scale, which for ordinary text is the font size
    const size = Math.abs(item.transform?.[3] ?? 0) || 12
    const jump = lastY !== null && y !== null ? Math.abs(y - lastY) : 0

    if (jump > size * 2) {
      // a gap of more than two lines reads as a new paragraph
      if (!text.endsWith('\n\n')) text += text.endsWith('\n') ? '\n' : '\n\n'
    } else if (jump > 2) {
      if (!text.endsWith('\n')) text += '\n'
    } else if (text && !text.endsWith(' ') && !text.endsWith('\n') && item.str) {
      text += ' '
    }

    text += item.str
    if (item.hasEOL && !text.endsWith('\n')) text += '\n'
    lastY = y
  }

  page.cleanup()
  return text.replace(/[ \t]+\n/g, '\n').trim()
}

export interface TextPiece {
  str: string
  /** left edge and baseline, in PDF points from the bottom-left corner */
  x: number
  y: number
  width: number
}

/** Positioned text runs of one page, for callers that need the layout back. */
export async function extractPageItems(doc: PDFDocumentProxy, index: number): Promise<TextPiece[]> {
  const page = await doc.getPage(index + 1)
  const content = await page.getTextContent()
  const pieces: TextPiece[] = []

  for (const item of content.items as (TextItemish & { width?: number })[]) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue
    pieces.push({
      str: item.str,
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
    })
  }

  page.cleanup()
  return pieces
}

export async function extractText(file: File, onProgress?: Progress): Promise<string[]> {
  const doc = await openPdf(file)
  try {
    const pages: string[] = []
    for (let i = 0; i < doc.numPages; i++) {
      onProgress?.(i, doc.numPages, `Reading page ${i + 1}`)
      pages.push(await extractPageText(doc, i))
    }
    return pages
  } finally {
    await closePdf(doc)
  }
}

export interface TextExportParams {
  /** 'joined' writes one file, 'per-page' writes one file per page */
  shape: 'joined' | 'per-page'
  /** add "--- page n ---" separators in the joined file */
  pageMarkers: boolean
}

export async function pdfToText(
  file: File,
  params: TextExportParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const pages = await extractText(file, onProgress)
  const base = baseName(file.name)

  if (params.shape === 'per-page') {
    const digits = String(pages.length).length
    return pages.map((text, i) => ({
      file: new File([text], `${base}-${String(i + 1).padStart(digits, '0')}.txt`, {
        type: 'text/plain',
      }),
      sourceName: file.name,
      sourceSize: Math.round(file.size / pages.length),
      note: `${text.length} chars`,
    }))
  }

  const joined = pages
    .map((text, i) => (params.pageMarkers ? `--- page ${i + 1} ---\n${text}` : text))
    .join('\n\n')

  return [
    {
      file: new File([joined], `${base}.txt`, { type: 'text/plain' }),
      sourceName: file.name,
      sourceSize: file.size,
      note: `${pages.length} pp · ${joined.length} chars`,
    },
  ]
}

export interface ChunkParams {
  /** rough characters per chunk; chunks break on paragraph boundaries */
  chunkChars: number
}

/** Splits text into chunks on blank lines, keeping each chunk near the target size. */
export function chunkText(
  pages: string[],
  chunkChars: number,
): { text: string; pages: number[] }[] {
  const chunks: { text: string; pages: number[] }[] = []
  let current = ''
  let touched: number[] = []

  const flush = () => {
    if (current.trim()) chunks.push({ text: current.trim(), pages: [...new Set(touched)] })
    current = ''
    touched = []
  }

  pages.forEach((page, index) => {
    for (const paragraph of page.split(/\n{2,}/)) {
      if (!paragraph.trim()) continue
      if (current.length + paragraph.length > chunkChars && current) flush()
      current += (current ? '\n\n' : '') + paragraph.trim()
      touched.push(index + 1)
    }
  })
  flush()

  return chunks
}

/** Markdown built for pasting into a chat or a retrieval pipeline. */
export async function pdfForAi(
  file: File,
  params: ChunkParams,
  onProgress?: Progress,
): Promise<OutputFile[]> {
  const pages = await extractText(file, onProgress)
  const chunks = chunkText(pages, params.chunkChars)
  const title = baseName(file.name)

  const markdown = [
    `# ${title}`,
    `Source: ${file.name} · ${pages.length} pages · ${chunks.length} chunks`,
    '',
    ...chunks.map(
      (chunk, i) =>
        `## Chunk ${i + 1} (page${chunk.pages.length > 1 ? 's' : ''} ${chunk.pages.join(', ')})\n\n${chunk.text}`,
    ),
  ].join('\n\n')

  return [
    {
      file: new File([markdown], `${title}.md`, { type: 'text/markdown' }),
      sourceName: file.name,
      sourceSize: file.size,
      note: `${chunks.length} chunks`,
    },
  ]
}
