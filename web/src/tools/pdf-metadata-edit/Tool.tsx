import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFileJob } from '@/lib/useFileJob'
import { clearMetadata, inspectPdf, writeMetadata, type PdfMetadata } from '@/ops/pdf/metadata'
import { meta } from './meta'

const FIELDS: { key: keyof PdfMetadata; label: string; placeholder: string }[] = [
  { key: 'title', label: 'Title', placeholder: 'Semester 4 marksheet' },
  { key: 'author', label: 'Author', placeholder: 'Your name' },
  { key: 'subject', label: 'Subject', placeholder: 'What the document is about' },
  { key: 'keywords', label: 'Keywords', placeholder: 'comma, separated' },
  { key: 'creator', label: 'Creator', placeholder: 'Application that made it' },
  { key: 'producer', label: 'Producer', placeholder: 'Application that wrote the PDF' },
]

export default function MetadataEditTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [values, setValues] = useState<PdfMetadata>({})
  const file = files.list[0]

  // preload whatever the document already carries
  useEffect(() => {
    if (!file) return
    let cancelled = false
    inspectPdf(file)
      .then((report) => {
        if (cancelled) return
        setValues({
          title: report.title ?? '',
          author: report.author ?? '',
          subject: report.subject ?? '',
          keywords: report.keywords ?? '',
          creator: report.creator ?? '',
          producer: report.producer ?? '',
        })
      })
      .catch(() => setValues({}))
    return () => {
      cancelled = true
    }
  }, [file])

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Writing metadata')
      const out = await writeMetadata(file, values)
      progress(1, 1, 'Done')
      return [out]
    })

  const clear = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Clearing metadata')
      const out = await clearMetadata(file)
      progress(1, 1, 'Done')
      setValues({})
      return [out]
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="SAVE METADATA"
      onRun={run}
      canRun={Boolean(file)}
      settings={
        <>
          {FIELDS.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`md-${field.key}`}>
              <Input
                id={`md-${field.key}`}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                maxLength={200}
                className="h-10 text-sm"
              />
            </Field>
          ))}

          <Button
            variant="outline"
            disabled={!file || job.status === 'running'}
            onClick={clear}
            className="tracking-[0.1em]"
          >
            CLEAR EVERYTHING INSTEAD
          </Button>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Clearing empties every field and drops the XMP stream, which is what you want before
            sending a document to someone else.
          </p>
        </>
      }
    />
  )
}
