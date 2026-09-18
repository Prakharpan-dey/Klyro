import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { repairPdf } from '@/ops/pdf/qpdf'
import { meta } from './meta'

export default function RepairTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await repairPdf(file))
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="REPAIR"
      onRun={run}
      settings={
        <Field label="When this helps">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A download that stopped halfway, a file a portal refuses, or a PDF that one reader opens
            and another does not. The document is parsed and written out fresh with a clean
            structure.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            It cannot invent missing pages. If too much of the file is gone, you get a clear error
            rather than a broken result.
          </p>
        </Field>
      }
    />
  )
}
