import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'

// the qpdf wasm is a URL import in the browser and a file path under node
vi.mock('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url', async () => {
  const { createRequire } = await import('node:module')
  const resolve = createRequire(import.meta.url)
  return { default: resolve.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm') }
})

const { expandPdf } = await import('./qpdf')
const { scanPrivacy, stripPdf, verifyStrip } = await import('./privacy')
const { readMetadata } = await import('./metadata')
const { loadPdf, savePdf } = await import('./load')

/**
 * The two defects these tests exist for: a scan that reads keys without
 * following references sees nothing on a real document, and "removing" a key
 * only unlinks it, leaving the bytes in the file.
 */

function asFile(bytes: Uint8Array, name = 'doc.pdf'): File {
  return new File([bytes as BlobPart], name, { type: 'application/pdf' })
}

/** A document whose hooks are all reached indirectly, as real writers produce. */
async function indirectPdf(): Promise<File> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([300, 400])
  const ctx = doc.context

  const script = ctx.register(
    ctx.obj({ S: PDFName.of('JavaScript'), JS: PDFString.of('app.alert("hi")') }),
  )
  const names = ctx.register(
    ctx.obj({
      JavaScript: ctx.obj({ Names: ctx.obj([PDFString.of('boot'), script]) }),
      EmbeddedFiles: ctx.obj({ Names: ctx.obj([PDFString.of('secret.txt'), ctx.obj({})]) }),
    }),
  )
  doc.catalog.set(PDFName.of('Names'), names)

  const annot = ctx.register(
    ctx.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Text'),
      Rect: ctx.obj([10, 10, 30, 30]),
      T: PDFString.of('Reviewer'),
      Contents: PDFString.of('check this'),
    }),
  )
  // the array itself is indirect too — this is what the old check missed
  page.node.set(PDFName.of('Annots'), ctx.register(ctx.obj([annot])))

  return asFile(await doc.save(), 'indirect.pdf')
}

/** A marksheet with the details a real one carries. */
async function richPdf(): Promise<File> {
  const doc = await PDFDocument.create()
  doc.setTitle('Semester 4 marksheet')
  doc.setAuthor('Registrar Office')
  doc.setCreator('CampusPrint 9')
  doc.setProducer('CampusPrint 9')
  doc.setSubject('Results')
  doc.setCreationDate(new Date('2026-03-11T09:00:00Z'))
  doc.addPage([300, 400])
  doc.addPage([300, 400])
  doc.catalog.set(PDFName.of('OCProperties'), doc.context.obj({ OCGs: doc.context.obj([]) }))
  return asFile(await doc.save(), 'marksheet.pdf')
}

/** Text as a PDF stores it, which is not the text you typed. */
const utf16Hex = (value: string) =>
  [...value].map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0')).join('')

const flag = (scan: { findings: { id: string; present: boolean }[] }) =>
  scan.findings.filter((f) => f.present).map((f) => f.id)

describe('scanPrivacy', () => {
  it('follows indirect references, where most documents hide their hooks', async () => {
    const found = flag(await scanPrivacy(await indirectPdf()))

    expect(found).toContain('javascript')
    expect(found).toContain('attachments')
    expect(found).toContain('annotations')
  }, 30_000)

  it('reports the timestamps and the producer, not just the title', async () => {
    const scan = await scanPrivacy(await richPdf())
    const metadata = scan.findings.find((f) => f.id === 'metadata')

    expect(metadata?.present).toBe(true)
    expect(metadata?.detail).toContain('CampusPrint 9')
    expect(metadata?.detail).toMatch(/timestamp/)
    expect(scan.secrets).toContain('Registrar Office')
  }, 30_000)

  it('sees hidden layers', async () => {
    expect(flag(await scanPrivacy(await richPdf()))).toContain('layers')
  }, 30_000)

  it('does not attach a form to a document that has none', async () => {
    const file = await richPdf()
    await scanPrivacy(file)

    // scanning must not change the document: pdf-lib's getForm() would create one
    const doc = await loadPdf(file)
    expect(doc.catalog.has(PDFName.of('AcroForm'))).toBe(false)
  }, 30_000)
})

describe('stripPdf', () => {
  it('takes the names, the dates and the layers out', async () => {
    const out = await stripPdf(await richPdf())
    const report = readMetadata(await loadPdf(out.file))

    expect(report.title).toBeUndefined()
    expect(report.author).toBeUndefined()
    expect(report.producer).toBeUndefined()
    expect(report.created).toBeUndefined()
    expect(flag(await scanPrivacy(out.file))).not.toContain('layers')
  }, 30_000)

  it('keeps the pages', async () => {
    const out = await stripPdf(await richPdf())
    expect((await loadPdf(out.file)).getPageCount()).toBe(2)
  }, 30_000)

  it('erases the author from the bytes, not just from the catalogue', async () => {
    const out = await stripPdf(await richPdf())

    // streams have to be decompressed first, or this search proves nothing
    const plain = await expandPdf(out.file)
    const text = new TextDecoder('latin1').decode(await plain.file.arrayBuffer())

    expect(text).not.toContain('Registrar Office')
    expect(text).not.toContain('CampusPrint 9')
    // and in the form a PDF actually stores text: UTF-16BE hex with a marker
    expect(text.toLowerCase()).not.toContain(utf16Hex('Registrar Office'))
  }, 30_000)

  it('and that assertion has teeth: a half-done strip still carries the name', async () => {
    // what unlinking alone achieves — the catalogue entry goes, the bytes stay
    const doc = await loadPdf(await richPdf())
    doc.catalog.delete(PDFName.of('Metadata'))
    const halfDone = await savePdf(doc, 'half-done.pdf')

    const plain = await expandPdf(halfDone)
    const text = new TextDecoder('latin1').decode(await plain.file.arrayBuffer())
    expect(text.toLowerCase()).toContain(utf16Hex('Registrar Office'))

    // and the checker sees it, which is the whole point of searching properly
    expect((await verifyStrip(halfDone, ['Registrar Office'])).leaked).toContain('Registrar Office')
  }, 30_000)

  it('leaves nothing orphaned', async () => {
    const out = await stripPdf(await indirectPdf())
    const remnants = (await scanPrivacy(out.file)).findings.find((f) => f.id === 'remnants')

    expect(remnants?.present).toBe(false)
  }, 30_000)
})

describe('verifyStrip', () => {
  it('finds nothing in the stripped file and everything in the original', async () => {
    const original = await richPdf()
    const { secrets } = await scanPrivacy(original)
    const out = await stripPdf(original)

    const after = await verifyStrip(out.file, secrets)
    expect(after.leaked).toEqual([])
    expect(after.thorough).toBe(true)
    expect(after.searchedBytes).toBeGreaterThan(0)

    const before = await verifyStrip(original, secrets)
    expect(before.leaked).toContain('Registrar Office')
  }, 30_000)
})
