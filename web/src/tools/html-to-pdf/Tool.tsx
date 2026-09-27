import { LayoutFields } from '@/components/tool/LayoutFields'
import { useLayoutParams } from '@/components/tool/useLayoutParams'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { htmlToPdf } from '@/ops/office/htmlToPdf'
import { meta } from './meta'

export default function HtmlToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const layout = useLayoutParams()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) out.push(await htmlToPdf(file, layout.params, progress))
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE PDF"
      onRun={run}
      cancellable
      footnote="Text only — nothing in the page is fetched or run"
      settings={
        <>
          <LayoutFields layout={layout} />
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            The markup is read rather than rendered, so the page keeps its words and loses its styling. Nothing in the file is given the chance to load an image or a script.
          </p>
        </>
      }
    />
  )
}
