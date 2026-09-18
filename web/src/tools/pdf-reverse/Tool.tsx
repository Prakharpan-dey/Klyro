import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Field } from '@/components/console/Field'
import { useFileJob } from '@/lib/useFileJob'
import { reversePdf } from '@/ops/pdf/arrange'
import { meta } from './meta'

export default function ReverseTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await reversePdf(file))
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
      runLabel="REVERSE"
      onRun={run}
      settings={
        <Field label="What this does">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            The last page becomes the first. Useful for scans made back to front, or documents in a
            right-to-left binding.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Rotation and page size are preserved. Nothing else changes.
          </p>
        </Field>
      }
    />
  )
}
