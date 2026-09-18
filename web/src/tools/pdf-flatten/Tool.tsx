import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { flattenPdf } from '@/ops/pdf/forms'
import { meta } from './meta'

export default function FlattenTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await flattenPdf(file))
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="FLATTEN"
      onRun={run}
      footnote="Flattened forms can no longer be edited, which is usually the point"
      settings={
        <Field label="When to use this">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            After filling a form, flattening draws the values into the page itself. Portals that
            reject filled forms, or viewers that show them blank, usually accept a flattened file.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Files without form fields pass through unchanged, and the result says so.
          </p>
        </Field>
      }
    />
  )
}
