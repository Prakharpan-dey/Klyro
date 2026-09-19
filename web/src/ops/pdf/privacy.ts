import type { PDFDict, PDFDocument } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'
import { readMetadata, type PdfReport } from './metadata'
import { collectGarbagePdf, expandPdf } from './qpdf'

/**
 * What a PDF is carrying that does not show on the page, and how to get rid of
 * it for real.
 *
 * Two things make this harder than it looks. A PDF may reach its own parts
 * indirectly, so a check that reads a key without following the reference sees
 * nothing on most real documents. And removing a key only unlinks it: pdf-lib
 * writes out every object it knows about, so an "erased" attachment is still
 * in the file for anyone who looks with a text editor. Both are handled here.
 */

export type FindingId =
  | 'metadata'
  | 'xmp'
  | 'annotations'
  | 'forms'
  | 'javascript'
  | 'attachments'
  | 'layers'
  | 'thumbnails'
  | 'revisions'
  | 'outline'
  | 'structure'
  | 'remnants'

export interface PrivacyFinding {
  id: FindingId
  label: string
  detail: string
  /** true when the document carries something worth removing */
  present: boolean
}

export interface PrivacyScan {
  report: PdfReport
  findings: PrivacyFinding[]
  /** identifying values recorded in this file, to search the output for later */
  secrets: string[]
}

// --- reading, following references ------------------------------------------

type Lib = Awaited<ReturnType<typeof pdfLib>>

/**
 * `node.get()` hands back a reference when the entry is indirect, which is how
 * most documents in the wild are written. Everything here looks through it.
 */
function reader(lib: Lib) {
  const { PDFName, PDFDict, PDFArray, PDFStream } = lib
  return {
    dict: (node: PDFDict, key: string) => node.lookupMaybe(PDFName.of(key), PDFDict),
    array: (node: PDFDict, key: string) => node.lookupMaybe(PDFName.of(key), PDFArray),
    stream: (node: PDFDict, key: string) => node.lookupMaybe(PDFName.of(key), PDFStream),
    has: (node: PDFDict, key: string) => node.has(PDFName.of(key)),
  }
}

interface Probe {
  annotations: number
  attachments: string[]
  scripts: string[]
  fields: number
  xmp: boolean
  layers: boolean
  thumbnails: number
  outline: boolean
  structure: boolean
}

/** Every place a script can hide, and every place a file can. */
async function probe(doc: PDFDocument): Promise<Probe> {
  const lib = await pdfLib()
  const at = reader(lib)
  const catalog = doc.catalog

  const scripts: string[] = []
  const attachments: string[] = []

  const names = at.dict(catalog, 'Names')
  if (names && at.has(names, 'JavaScript')) scripts.push('a document-level script')
  if (names && at.has(names, 'EmbeddedFiles')) attachments.push('files attached to the document')

  const open = at.dict(catalog, 'OpenAction')
  if (open && String(open.get(lib.PDFName.of('S')) ?? '') === '/JavaScript') {
    scripts.push('a script that runs when the file opens')
  }
  if (at.has(catalog, 'AA')) scripts.push('document actions')
  if (at.has(catalog, 'AF')) attachments.push('associated files')
  if (at.has(catalog, 'Collection')) attachments.push('a portfolio of other documents')

  const form = at.dict(catalog, 'AcroForm')
  if (form && at.has(form, 'XFA')) scripts.push('an XFA form, which carries its own data')
  const fields = form ? (at.array(form, 'Fields')?.size() ?? 0) : 0

  let annotations = 0
  let thumbnails = 0
  for (const page of doc.getPages()) {
    const annots = at.array(page.node, 'Annots')
    annotations += annots?.size() ?? 0
    if (at.has(page.node, 'AA')) scripts.push('actions on a page')
    if (at.has(page.node, 'Thumb')) thumbnails++

    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const annot = annots?.lookup(i, lib.PDFDict)
      if (!annot) continue
      const subtype = String(annot.get(lib.PDFName.of('Subtype')) ?? '')
      if (subtype === '/FileAttachment') attachments.push('a file clipped to a page')
      if (at.has(annot, 'AA')) scripts.push('actions on an annotation')
    }
  }

  return {
    annotations,
    attachments: [...new Set(attachments)],
    scripts: [...new Set(scripts)],
    fields,
    xmp: Boolean(at.stream(catalog, 'Metadata')),
    layers: at.has(catalog, 'OCProperties'),
    thumbnails,
    outline: at.has(catalog, 'Outlines'),
    structure: at.has(catalog, 'StructTreeRoot'),
  }
}

/** Objects in the file that nothing reaches any more — removed in name only. */
async function countRemnants(doc: PDFDocument): Promise<number> {
  const { PDFArray, PDFDict, PDFRef, PDFStream } = await pdfLib()
  const seen = new Set<string>()
  // seed with the trailer's own references, so the catalogue's reference is
  // marked as reached rather than looking like an orphan
  const queue: unknown[] = [doc.context.trailerInfo.Root, doc.context.trailerInfo.Info, doc.catalog]

  while (queue.length) {
    const node: unknown = queue.pop()

    if (node instanceof PDFRef) {
      const key = node.toString()
      if (seen.has(key)) continue
      seen.add(key)
      queue.push(doc.context.lookup(node))
    } else if (node instanceof PDFStream) {
      // a stream's own dictionary can hold references of its own
      queue.push((node as unknown as { dict: unknown }).dict)
    } else if (node instanceof PDFDict) {
      for (const [, value] of node.entries()) queue.push(value)
    } else if (node instanceof PDFArray) {
      for (let i = 0; i < node.size(); i++) queue.push(node.get(i))
    }
  }

  return doc.context.enumerateIndirectObjects().filter(([ref]) => !seen.has(ref.toString())).length
}

/** How many times the file has been saved on top of itself. */
async function countRevisions(file: File): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const marker = [0x25, 0x25, 0x45, 0x4f, 0x46] // %%EOF
  let found = 0
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) if (bytes[i + j] !== marker[j]) continue outer
    found++
  }
  return found
}

export async function scanPrivacy(file: File): Promise<PrivacyScan> {
  const doc = await loadPdf(file)
  const report = readMetadata(doc)
  const found = await probe(doc)
  const remnants = await countRemnants(doc)
  const revisions = await countRevisions(file)

  const secrets = [
    report.title,
    report.author,
    report.subject,
    report.keywords,
    report.creator,
    report.producer,
  ].filter((value): value is string => Boolean(value) && String(value).trim().length >= 3)

  const dates = [report.created, report.modified].filter(Boolean).length
  const named = secrets.length

  const findings: PrivacyFinding[] = [
    {
      id: 'metadata',
      label: 'Document information',
      detail: named
        ? `Carries ${named} recorded value${named === 1 ? '' : 's'}: ${secrets.join(' · ')}${dates ? `, plus ${dates} timestamp${dates === 1 ? '' : 's'}` : ''}`
        : dates
          ? `No name recorded, but ${dates} timestamp${dates === 1 ? '' : 's'}`
          : 'No title, author, creator or timestamps',
      present: named > 0 || dates > 0,
    },
    {
      id: 'xmp',
      label: 'XMP metadata',
      detail: found.xmp
        ? 'A second copy of the document details, in a separate stream'
        : 'No XMP stream',
      present: found.xmp,
    },
    {
      id: 'annotations',
      label: 'Annotations',
      detail: found.annotations
        ? `${found.annotations} annotation${found.annotations === 1 ? '' : 's'} — comments, highlights or links, each with an author and a date`
        : 'No annotations',
      present: found.annotations > 0,
    },
    {
      id: 'forms',
      label: 'Form fields',
      detail: found.fields
        ? `${found.fields} field${found.fields === 1 ? '' : 's'}, which may still hold what was typed into them`
        : 'No form fields',
      present: found.fields > 0,
    },
    {
      id: 'javascript',
      label: 'Scripts',
      detail: found.scripts.length
        ? `Runs ${found.scripts.join(', ')}`
        : 'No scripts anywhere in the file',
      present: found.scripts.length > 0,
    },
    {
      id: 'attachments',
      label: 'Hidden files',
      detail: found.attachments.length
        ? `Carries ${found.attachments.join(', ')}`
        : 'No files hidden inside',
      present: found.attachments.length > 0,
    },
    {
      id: 'layers',
      label: 'Hidden layers',
      detail: found.layers
        ? 'Optional layers: content that is in the file but may not be shown'
        : 'No optional layers',
      present: found.layers,
    },
    {
      id: 'thumbnails',
      label: 'Page thumbnails',
      detail: found.thumbnails
        ? `${found.thumbnails} stored preview image${found.thumbnails === 1 ? '' : 's'}, which can show the page as it was before an edit`
        : 'No stored previews',
      present: found.thumbnails > 0,
    },
    {
      id: 'revisions',
      label: 'Earlier versions',
      detail:
        revisions > 1
          ? `Saved ${revisions} times on top of itself — earlier versions are still inside`
          : 'Only one version in the file',
      present: revisions > 1,
    },
    {
      id: 'outline',
      label: 'Bookmarks',
      detail: found.outline ? 'A bookmark tree, which names sections' : 'No bookmarks',
      present: found.outline,
    },
    {
      id: 'structure',
      label: 'Tagged structure',
      detail: found.structure
        ? 'A tag tree, which can hold a second copy of the page text'
        : 'No tag tree',
      present: found.structure,
    },
    {
      id: 'remnants',
      label: 'Leftover objects',
      detail: remnants
        ? `${remnants} object${remnants === 1 ? '' : 's'} nothing points at any more, still written into the file`
        : 'Nothing orphaned',
      present: remnants > 0,
    },
  ]

  return { report, findings, secrets }
}

// --- removing ---------------------------------------------------------------

const CATALOG_KEYS = [
  'Metadata',
  'Names',
  'OpenAction',
  'AA',
  'AcroForm',
  'OCProperties',
  'Outlines',
  'StructTreeRoot',
  'MarkInfo',
  'PieceInfo',
  'AF',
  'Collection',
  'DSS',
  'Perms',
  'Legal',
]

const PAGE_KEYS = ['Annots', 'AA', 'Thumb', 'PieceInfo', 'Metadata']

/** Removes everything the scan flags: names, hidden files, scripts and the rest. */
export async function stripPdf(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFName, PDFRef } = await pdfLib()

  // flatten first: it paints the values onto the page before the form goes
  const form = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), (await pdfLib()).PDFDict)
  if (form) {
    try {
      doc.getForm().flatten()
    } catch {
      // a malformed form can refuse to flatten; dropping AcroForm still removes the values
    }
  }

  for (const key of CATALOG_KEYS) doc.catalog.delete(PDFName.of(key))
  for (const page of doc.getPages()) {
    for (const key of PAGE_KEYS) page.node.delete(PDFName.of(key))
  }

  // the whole info dictionary, not six blanked fields — that leaves the dates
  const info = doc.context.trailerInfo.Info
  if (info instanceof PDFRef) doc.context.delete(info)
  delete doc.context.trailerInfo.Info
  // a fresh ID, so this copy cannot be matched against the original
  delete doc.context.trailerInfo.ID

  const pages = doc.getPageCount()
  const rewritten = await savePdf(doc, `${baseName(file.name)}-stripped.pdf`)

  // pdf-lib writes every object it was ever told about, so unlinking is not
  // erasing. qpdf rebuilds from what is reachable, which drops the rest.
  let cleaned = rewritten
  let tidied = true
  try {
    cleaned = (await collectGarbagePdf(rewritten)).file
  } catch {
    // the engine may be unavailable or out of room; removing still happened,
    // and the warning below says what was not achieved
    tidied = false
  }

  return {
    file: new File([await cleaned.arrayBuffer()], `${baseName(file.name)}-stripped.pdf`, {
      type: 'application/pdf',
    }),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${pages} pp`,
    warning: tidied
      ? undefined
      : 'Removed, but the file could not be rebuilt, so traces may remain in the bytes.',
  }
}

export async function removeAnnotations(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFName } = await pdfLib()
  doc.getPages().forEach((page) => page.node.delete(PDFName.of('Annots')))
  return {
    file: await savePdf(doc, `${baseName(file.name)}-no-annotations.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: `${doc.getPageCount()} pp`,
  }
}

// --- proving it ---------------------------------------------------------------

export interface StripVerdict {
  scan: PrivacyScan
  /** recorded values still findable in the output */
  leaked: string[]
  /** bytes actually searched, after decompressing */
  searchedBytes: number
  /** false when the file could not be decompressed, so the search was shallow */
  thorough: boolean
}

/**
 * The same text as a PDF may store it. pdf-lib writes document information as
 * UTF-16BE hex with a byte-order mark, so searching for the plain characters
 * finds nothing and proves nothing.
 */
function encodings(value: string): string[] {
  const chars = [...value]
  const latin = value
  const utf16Bytes = chars.map((ch) => ` ${ch}`).join('')
  const asciiHex = chars.map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  const utf16Hex = chars.map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0')).join('')

  const forms = [latin, utf16Bytes, asciiHex, utf16Hex, `feff${utf16Hex}`]
  return [...forms, ...forms.map((form) => form.toUpperCase())]
}

/**
 * Looks for the values the input recorded inside the finished file. Streams are
 * decompressed first, because a name inside a compressed object would otherwise
 * pass a search that proves nothing.
 */
export async function verifyStrip(output: File, secrets: string[]): Promise<StripVerdict> {
  let searchable = output
  let thorough = true
  try {
    searchable = (await expandPdf(output)).file
  } catch {
    thorough = false
  }

  const text = new TextDecoder('latin1').decode(await searchable.arrayBuffer())
  const leaked = secrets.filter((secret) => encodings(secret).some((form) => text.includes(form)))

  return {
    scan: await scanPrivacy(output),
    leaked,
    searchedBytes: searchable.size,
    thorough,
  }
}
