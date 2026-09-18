import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { fillForm, flattenPdf, readFormFields } from './forms'
import { clearMetadata, inspectPdf, metadataToText, writeMetadata } from './metadata'
import { removeAnnotations, scanPrivacy, stripPdf } from './privacy'
import { textToPdf, wrapText } from './textToPdf'

/** A document carrying metadata, a text field and a checkbox. */
async function richPdf(): Promise<File> {
  const doc = await PDFDocument.create()
  doc.setTitle('Semester 4 marksheet')
  doc.setAuthor('Registrar Office')
  doc.setSubject('Results')
  doc.setKeywords(['marksheet', '2026'])
  doc.setCreator('CampusPrint 9')
  doc.setProducer('CampusPrint 9')

  const page = doc.addPage([420, 595])
  doc.addPage([420, 595])
  const form = doc.getForm()
  form.createTextField('student.name').addToPage(page, { x: 40, y: 400, width: 200, height: 20 })
  form.createCheckBox('student.verified').addToPage(page, { x: 40, y: 360, width: 16, height: 16 })

  return new File([(await doc.save()) as BlobPart], 'marksheet.pdf', { type: 'application/pdf' })
}

describe('metadata', () => {
  it('reads every field plus page facts', async () => {
    const report = await inspectPdf(await richPdf())
    expect(report).toMatchObject({
      title: 'Semester 4 marksheet',
      author: 'Registrar Office',
      subject: 'Results',
      creator: 'CampusPrint 9',
      pages: 2,
    })
    expect(report.pageSizes).toEqual(['148 x 210 mm'])
  })

  it('writes the fields it is given', async () => {
    const out = await writeMetadata(await richPdf(), { title: 'Renamed', author: 'Me' })
    const report = await inspectPdf(out.file)
    expect(report.title).toBe('Renamed')
    expect(report.author).toBe('Me')
    expect(report.subject).toBeUndefined()
  })

  it('clears everything', async () => {
    const out = await clearMetadata(await richPdf())
    const report = await inspectPdf(out.file)
    expect(report.title).toBeUndefined()
    expect(report.author).toBeUndefined()
    expect(report.creator).toBeUndefined()
    expect(report.pages).toBe(2)
  })

  it('renders a readable report, skipping empty fields', async () => {
    const report = await inspectPdf(await richPdf())
    const text = metadataToText(report, 'marksheet.pdf')
    expect(text).toContain('Author: Registrar Office')
    expect(text).not.toContain('Subject: undefined')
  })
})

describe('privacy', () => {
  it('flags metadata, annotations and form fields, then reports a clean file', async () => {
    const source = await richPdf()
    const before = await scanPrivacy(source)
    expect(
      before.findings
        .filter((f) => f.present)
        .map((f) => f.id)
        .sort(),
    ).toEqual(['annotations', 'forms', 'metadata'])

    const stripped = await stripPdf(source)
    const after = await scanPrivacy(stripped.file)
    expect(after.findings.filter((f) => f.present)).toHaveLength(0)
    expect(after.report.pages).toBe(2)
  })

  it('removes annotations without touching metadata', async () => {
    const out = await removeAnnotations(await richPdf())
    const scan = await scanPrivacy(out.file)
    expect(scan.findings.find((f) => f.id === 'annotations')?.present).toBe(false)
    expect(scan.report.title).toBe('Semester 4 marksheet')
  })
})

describe('forms', () => {
  it('lists fields with their kinds', async () => {
    const fields = await readFormFields(await richPdf())
    expect(fields).toEqual([
      { name: 'student.name', kind: 'text', value: '' },
      { name: 'student.verified', kind: 'checkbox', value: '' },
    ])
  })

  it('fills values and keeps them readable', async () => {
    const out = await fillForm(await richPdf(), {
      values: { 'student.name': 'Prakhar', 'student.verified': 'on' },
      flatten: false,
    })
    expect(await readFormFields(out.file)).toEqual([
      { name: 'student.name', kind: 'text', value: 'Prakhar' },
      { name: 'student.verified', kind: 'checkbox', value: 'on' },
    ])
  })

  it('flattening removes the fields', async () => {
    const filled = await fillForm(await richPdf(), {
      values: { 'student.name': 'Prakhar' },
      flatten: true,
    })
    expect(await readFormFields(filled.file)).toHaveLength(0)
  })

  it('reports when there is nothing to flatten', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([200, 200])
    const plain = new File([(await doc.save()) as BlobPart], 'plain.pdf')
    expect((await flattenPdf(plain)).note).toBe('no form fields')
  })
})

describe('wrapText', () => {
  it('wraps on words, keeps blank lines and splits unbreakable words', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)

    const lines = wrapText('hello world '.repeat(20).trim(), font, 12, 100)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every((l) => font.widthOfTextAtSize(l, 12) <= 100)).toBe(true)

    expect(wrapText('a\n\nb', font, 12, 500)).toEqual(['a', '', 'b'])

    const long = wrapText('X'.repeat(200), font, 12, 100)
    expect(long.length).toBeGreaterThan(1)
  })
})

describe('textToPdf', () => {
  it('flows text onto as many pages as it needs', async () => {
    const short = await textToPdf({
      text: 'one line',
      pageSize: 'a4',
      family: 'helvetica',
      size: 11,
      marginMm: 20,
      name: 'notes',
    })
    expect(short.note).toBe('1 pp')
    expect(short.file.name).toBe('notes.pdf')

    const long = await textToPdf({
      text: 'paragraph text here. '.repeat(1200),
      pageSize: 'a4',
      family: 'helvetica',
      size: 11,
      marginMm: 20,
    })
    expect(Number.parseInt(long.note!, 10)).toBeGreaterThan(3)
  })

  it('refuses non-Latin text rather than writing a broken file', async () => {
    await expect(
      textToPdf({
        text: 'नमस्ते',
        pageSize: 'a4',
        family: 'helvetica',
        size: 11,
        marginMm: 20,
      }),
    ).rejects.toThrow(/Latin/)
  })
})
