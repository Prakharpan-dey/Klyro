import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { removeAnnotations } from '@/ops/pdf/privacy'
import { meta } from './meta'

export default function RemoveAnnotationsTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await removeAnnotations(file))
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
      runLabel="REMOVE ANNOTATIONS"
      onRun={run}
      settings={
        <Field label="What gets removed">
          <ul className="flex flex-col gap-2 font-sans text-[12.5px] leading-relaxed text-soft">
            <li>Comments, sticky notes and review marks</li>
            <li>Highlights, underlines and drawing markup</li>
            <li>Link areas, including ones pointing outside the document</li>
          </ul>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Page content is untouched. To remove filled-in form values too, use Flatten PDF or the
            Privacy Check.
          </p>
        </Field>
      }
    />
  )
}
