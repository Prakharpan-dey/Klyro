import type { PDFDocument } from 'pdf-lib'
import type { OutputFile } from '../types'
import { baseName, loadPdf, pdfLib, savePdf } from './load'

export type FieldKind = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'other'

export interface FormField {
  name: string
  kind: FieldKind
  value: string
  /** choices for radio groups and dropdowns */
  options?: string[]
}

async function classify(doc: PDFDocument): Promise<FormField[]> {
  const { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } = await pdfLib()

  return doc
    .getForm()
    .getFields()
    .map((field) => {
      const name = field.getName()
      if (field instanceof PDFTextField) {
        return { name, kind: 'text' as const, value: field.getText() ?? '' }
      }
      if (field instanceof PDFCheckBox) {
        return { name, kind: 'checkbox' as const, value: field.isChecked() ? 'on' : '' }
      }
      if (field instanceof PDFRadioGroup) {
        return {
          name,
          kind: 'radio' as const,
          value: field.getSelected() ?? '',
          options: field.getOptions(),
        }
      }
      if (field instanceof PDFDropdown) {
        return {
          name,
          kind: 'dropdown' as const,
          value: field.getSelected()[0] ?? '',
          options: field.getOptions(),
        }
      }
      return { name, kind: 'other' as const, value: '' }
    })
}

export async function readFormFields(file: File): Promise<FormField[]> {
  return classify(await loadPdf(file))
}

export interface FillFormParams {
  /** field name to new value; '' clears a checkbox or leaves text empty */
  values: Record<string, string>
  /** bake the values into the page so they can no longer be edited */
  flatten: boolean
}

export async function fillForm(file: File, params: FillFormParams): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } = await pdfLib()
  const form = doc.getForm()

  for (const [name, value] of Object.entries(params.values)) {
    const field = form.getFields().find((f) => f.getName() === name)
    if (!field) continue
    try {
      if (field instanceof PDFTextField) {
        field.setText(value)
      } else if (field instanceof PDFCheckBox) {
        if (value) field.check()
        else field.uncheck()
      } else if (field instanceof PDFRadioGroup) {
        if (value) field.select(value)
      } else if (field instanceof PDFDropdown) {
        if (value) field.select(value)
      }
    } catch {
      // a value the field rejects (unknown option) should not abort the whole fill
    }
  }

  if (params.flatten) form.flatten()

  return {
    file: await savePdf(doc, `${baseName(file.name)}-filled.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: params.flatten ? 'filled, flattened' : 'filled',
  }
}

/** Bakes form values and annotation appearances into the page content. */
export async function flattenPdf(file: File): Promise<OutputFile> {
  const doc = await loadPdf(file)
  const form = doc.getForm()
  const fields = form.getFields().length
  if (fields) form.flatten()

  return {
    file: await savePdf(doc, `${baseName(file.name)}-flat.pdf`),
    sourceName: file.name,
    sourceSize: file.size,
    note: fields ? `${fields} field(s) flattened` : 'no form fields',
  }
}
