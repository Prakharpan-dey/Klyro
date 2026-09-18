import { useEffect, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFileJob } from '@/lib/useFileJob'
import { fillForm, readFormFields, type FormField } from '@/ops/pdf/forms'
import { meta } from './meta'

export default function FillFormTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [loaded, setFields] = useState<{ file?: File; fields: FormField[] }>({ fields: [] })
  const [values, setValues] = useState<Record<string, string>>({})
  const [flatten, setFlatten] = useState(true)
  const [error, setError] = useState<string>()
  const file = files.list[0]

  useEffect(() => {
    if (!file) return
    let cancelled = false
    readFormFields(file)
      .then((found) => {
        if (cancelled) return
        setFields({ file, fields: found })
        setValues(Object.fromEntries(found.map((f) => [f.name, f.value])))
        setError(undefined)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Unreadable PDF'))
    return () => {
      cancelled = true
    }
  }, [file])

  const run = () =>
    job.run(async (progress) => {
      progress(0, 1, 'Filling fields')
      const out = await fillForm(file, { values, flatten })
      progress(1, 1, 'Done')
      return [out]
    })

  // results belong to the file they were read from
  const fields = loaded.file === file ? loaded.fields : []

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }))

  const workbench = file ? (
    <Panel
      label="C · Fields"
      tone="deep"
      meta={
        error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-dim">{fields.length} found</span>
        )
      }
    >
      {fields.length === 0 && !error && (
        <p className="mt-3.5 font-sans text-[12.5px] text-faint">
          This PDF has no fillable form fields. Many "forms" are just printed boxes; for those, use
          Sign PDF or Header &amp; Footer to place text.
        </p>
      )}
      <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className="border border-line-soft bg-well p-3">
            <div className="truncate readout text-[10px] text-dim" title={field.name}>
              {field.name}
            </div>
            {field.kind === 'checkbox' ? (
              <div className="mt-2 flex items-center justify-between">
                <Label htmlFor={`f-${field.name}`} className="font-sans text-[12.5px] text-soft">
                  Ticked
                </Label>
                <Switch
                  id={`f-${field.name}`}
                  checked={Boolean(values[field.name])}
                  onCheckedChange={(on) => set(field.name, on ? 'on' : '')}
                />
              </div>
            ) : field.options?.length ? (
              <select
                value={values[field.name] ?? ''}
                onChange={(e) => set(field.name, e.target.value)}
                className="mt-2 h-9 w-full border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring"
              >
                <option value="">—</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={values[field.name] ?? ''}
                onChange={(e) => set(field.name, e.target.value)}
                className="mt-2 h-9 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </Panel>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      workbench={workbench}
      runLabel="FILL FORM"
      onRun={run}
      canRun={Boolean(file) && fields.length > 0}
      footnote={fields.length ? `${fields.length} field(s) ready` : undefined}
      settings={
        <>
          <Field label="After filling">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ff-flatten" className="font-sans text-[12.5px] text-soft">
                Flatten so values cannot be changed
              </Label>
              <Switch id="ff-flatten" checked={flatten} onCheckedChange={setFlatten} />
            </div>
          </Field>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Values you type stay in this tab. The filled PDF is written on your machine when you
            press save.
          </p>
        </>
      }
    />
  )
}
