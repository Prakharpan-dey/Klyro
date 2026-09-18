import { Field } from '@/components/console/Field'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { linearizePdf } from '@/ops/pdf/qpdf'
import { meta } from './meta'

export default function LinearizeTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const [i, file] of files.list.entries()) {
        progress(i, files.list.length, file.name)
        out.push(await linearizePdf(file))
      }
      progress(files.list.length, files.list.length, 'Done')
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      runLabel="LINEARIZE"
      onRun={run}
      footnote="Also called fast web view"
      settings={
        <Field label="What it changes">
          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            The file is rearranged so the first page can be shown before the rest has downloaded.
            Handy for documents you host online or send to people on slow connections.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Content is untouched; only the internal layout changes. The file often grows slightly.
          </p>
        </Field>
      }
    />
  )
}
