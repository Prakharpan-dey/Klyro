import type { OutputFile, Progress } from '../types'
import { EmptyDocumentError } from './docxToPdf'
import { paragraphsToPdf, type LayoutParams, type Paragraph } from './layout'

/**
 * Reads Rich Text Format.
 *
 * RTF is not markup — it is a stream of `\control` words, braces for grouping
 * and literal text, written in 1987 and still what "Save as .rtf" produces. The
 * parts that matter here are few: `\par` ends a paragraph, `\b` and `\i` switch
 * styling on and off, `\'xx` is a byte in the current code page, and a control
 * word starting a group marked `\*` introduces something optional that can be
 * skipped wholesale.
 *
 * Everything else — fonts, colours, tables, embedded objects — is dropped, and
 * the tool copy says so.
 */

interface State {
  bold: boolean
  italic: boolean
  /** a group that should not be printed at all, e.g. \\*\\generator */
  skip: boolean
  heading: number
}

/** Control words whose group holds metadata rather than body text. */
const SKIP_GROUPS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'header',
  'footer',
  'footnote',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'generator',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
])

export function rtfToParagraphs(rtf: string): Paragraph[] {
  const out: Paragraph[] = []
  const stack: State[] = []
  let state: State = { bold: false, italic: false, skip: false, heading: 0 }
  let buffer = ''

  const flush = () => {
    const text = buffer.replace(/\s+/g, ' ').trim()
    buffer = ''
    if (!text) return
    const style: Paragraph['style'] =
      state.heading === 1 ? 'h1' : state.heading === 2 ? 'h2' : state.heading >= 3 ? 'h3' : 'body'
    out.push({ text, style, bold: state.bold, italic: state.italic })
    state.heading = 0
  }

  for (let i = 0; i < rtf.length; i++) {
    const char = rtf[i]

    if (char === '{') {
      stack.push({ ...state })
      continue
    }

    if (char === '}') {
      flush()
      state = stack.pop() ?? state
      continue
    }

    if (char === '\\') {
      const next = rtf[i + 1]

      // an escaped brace, backslash or a hex byte
      if (next === '{' || next === '}' || next === '\\') {
        if (!state.skip) buffer += next
        i += 1
        continue
      }
      if (next === "'") {
        const code = Number.parseInt(rtf.slice(i + 2, i + 4), 16)
        if (!state.skip && Number.isFinite(code)) buffer += String.fromCharCode(code)
        i += 3
        continue
      }
      if (next === '*') {
        state.skip = true
        i += 1
        continue
      }

      const word = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i + 1))
      if (!word) continue
      i += word[0].length
      const name = word[1]
      const value = word[2] === undefined ? undefined : Number(word[2])

      if (SKIP_GROUPS.has(name)) {
        state.skip = true
        continue
      }

      switch (name) {
        case 'par':
        case 'line':
          flush()
          break
        case 'pard':
          state.bold = false
          state.italic = false
          break
        case 'page':
          flush()
          out.push({ text: '', style: 'break' })
          break
        case 'b':
          state.bold = value !== 0
          break
        case 'i':
          state.italic = value !== 0
          break
        case 'plain':
          state.bold = false
          state.italic = false
          break
        case 'outlinelevel':
          state.heading = (value ?? 0) + 1
          break
        case 'tab':
          if (!state.skip) buffer += ' '
          break
        case 'u': {
          // \\uN is a unicode code point, followed by a fallback character to skip
          if (!state.skip && value !== undefined && value >= 0) {
            buffer += String.fromCodePoint(value)
          }
          break
        }
        default:
          break
      }
      continue
    }

    if (char === '\n' || char === '\r') continue
    if (!state.skip) buffer += char
  }

  flush()
  return out
}

export async function rtfToPdf(
  file: File,
  params: LayoutParams,
  onProgress?: Progress,
): Promise<OutputFile> {
  onProgress?.(0, 1, 'Reading the document')
  const paragraphs = rtfToParagraphs(await file.text())
  if (!paragraphs.length) throw new EmptyDocumentError('RTF file')

  return paragraphsToPdf(paragraphs, file, params, onProgress)
}
