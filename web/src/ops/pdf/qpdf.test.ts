import { PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'

// In a browser the .wasm is served as a URL; under node it has to be a real path,
// so the test points the loader straight at the file in node_modules.
vi.mock('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url', async () => {
  const { createRequire } = await import('node:module')
  const resolve = createRequire(import.meta.url)
  return { default: resolve.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm') }
})

const { decryptPdf, encryptPdf, linearizePdf, QpdfError, repairPdf } = await import('./qpdf')

async function makePdf(pages = 3): Promise<File> {
  const doc = await PDFDocument.create()
  doc.setTitle('fixture')
  for (let i = 0; i < pages; i++) doc.addPage([200 + i, 300])
  return new File([(await doc.save()) as BlobPart], 'fixture.pdf', { type: 'application/pdf' })
}

function bodyOf(bytes: ArrayBuffer) {
  return new TextDecoder('latin1').decode(bytes)
}

describe('encryptPdf', () => {
  it('locks the file with AES-256 and pdf-lib can no longer open it', async () => {
    const out = await encryptPdf(await makePdf(), {
      userPassword: 'hunter2',
      allowPrinting: true,
      allowCopying: false,
      allowModifying: false,
    })
    const bytes = await out.file.arrayBuffer()
    expect(out.file.name).toBe('fixture-encrypted.pdf')
    expect(bodyOf(bytes)).toContain('AESV3')
    await expect(PDFDocument.load(bytes)).rejects.toThrow()
  }, 30_000)

  it('refuses an empty password', async () => {
    await expect(
      encryptPdf(await makePdf(1), {
        userPassword: '',
        allowPrinting: true,
        allowCopying: true,
        allowModifying: true,
      }),
    ).rejects.toBeInstanceOf(QpdfError)
  })
})

describe('decryptPdf', () => {
  it('round trips with the right password', async () => {
    const locked = await encryptPdf(await makePdf(), {
      userPassword: 'hunter2',
      allowPrinting: true,
      allowCopying: false,
      allowModifying: false,
    })
    const open = await decryptPdf(locked.file, 'hunter2')
    const doc = await PDFDocument.load(await open.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(3)
    expect(doc.getTitle()).toBe('fixture')
  }, 30_000)

  it('rejects the wrong password', async () => {
    const locked = await encryptPdf(await makePdf(1), {
      userPassword: 'hunter2',
      allowPrinting: true,
      allowCopying: false,
      allowModifying: false,
    })
    await expect(decryptPdf(locked.file, 'nope')).rejects.toBeInstanceOf(QpdfError)
  }, 30_000)
})

describe('repairPdf', () => {
  it('rebuilds a file whose offsets have been shifted', async () => {
    const good = new Uint8Array(await (await makePdf(2)).arrayBuffer())
    const junk = new TextEncoder().encode('stray bytes\n')
    const broken = new File([new Uint8Array([...junk, ...good]) as BlobPart], 'broken.pdf', {
      type: 'application/pdf',
    })
    const out = await repairPdf(broken)
    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(2)
  }, 30_000)

  it('gives up on a file that is not a PDF', async () => {
    const junk = new File([new TextEncoder().encode('hello') as BlobPart], 'note.pdf', {
      type: 'application/pdf',
    })
    await expect(repairPdf(junk)).rejects.toBeInstanceOf(QpdfError)
  }, 30_000)
})

describe('linearizePdf', () => {
  it('keeps every page', async () => {
    const out = await linearizePdf(await makePdf(4))
    const doc = await PDFDocument.load(await out.file.arrayBuffer())
    expect(doc.getPageCount()).toBe(4)
    expect(out.file.name).toBe('fixture-web.pdf')
  }, 30_000)
})
