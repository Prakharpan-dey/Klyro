import { baseName } from '../pdf/load'
import type { CellValue, Sheet } from './xlsx'

/**
 * Comma-separated values, read the way RFC 4180 describes and the way
 * spreadsheets actually write them.
 *
 * The format looks trivial and is not: a quoted field can hold the delimiter,
 * a doubled quote, or a whole line break; Excel in most of Europe writes
 * semicolons because the comma is the decimal mark; and a leading byte-order
 * mark turns the first header into something that no longer matches. Each of
 * those prints a broken table when ignored, so each is handled here.
 */

export type Delimiter = ',' | ';' | '\t'

const CANDIDATES: Delimiter[] = [',', ';', '\t']

/**
 * Picks the delimiter that splits the first lines into the most consistent
 * number of columns. Counting raw occurrences is not enough: a comma-separated
 * file full of prose has semicolons in it too, but not the same number per row.
 */
export function sniffDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 10)
  if (!lines.length) return ','

  let best: Delimiter = ','
  let bestScore = -1

  for (const delimiter of CANDIDATES) {
    const counts = lines.map((line) => parseRows(line, delimiter)[0]?.length ?? 0)
    const first = counts[0]
    if (first < 2) continue
    // every line agreeing on the column count is the signal; more columns breaks ties
    const agreeing = counts.filter((count) => count === first).length
    const score = agreeing * 100 + first
    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }

  return best
}

/** Splits text into rows of raw strings, honouring quotes. */
export function parseRows(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"' && field === '') {
      quoted = true
      i++
      continue
    }
    if (char === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (char === '\r' || char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      // a CRLF is one line break, not two
      i += char === '\r' && text[i + 1] === '\n' ? 2 : 1
      continue
    }

    field += char
    i++
  }

  // the last line has no terminator more often than not
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/**
 * A cell becomes a number only when printing that number gives back exactly
 * what was written. `00123`, `+44 20 7946`, `1e5` and `12.50` all stay text,
 * because a reader would not recognise them once reformatted.
 */
export function toCell(raw: string): CellValue {
  const value = raw.trim()
  if (!value) return null
  if (/^-?(0|[1-9]\d*)(\.\d*[1-9])?$/.test(value)) {
    const n = Number(value)
    if (Number.isFinite(n) && String(n) === value) return n
  }
  return value
}

export function parseCsv(text: string, name: string, delimiter?: Delimiter): Sheet {
  const clean = text.replace(/^﻿/, '')
  const rows = parseRows(clean, delimiter ?? sniffDelimiter(clean))
    .map((row) => row.map(toCell))
    // a blank line between rows is not a row
    .filter((row) => row.some((cell) => cell !== null))

  return { name: baseName(name), rows }
}
