import { LayoutFields } from '@/components/tool/LayoutFields'
import { useLayoutParams } from '@/components/tool/useLayoutParams'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { rtfToPdf } from '@/ops/office/rtf'
import { meta } from './meta'

export default function RtfToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const layout = useLayoutParams()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) out.push(await rtfToPdf(file, layout.params, progress))
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
      footnote="Paragraphs, bold and italic — tables and images are dropped"
      settings={
        <>
          <LayoutFields layout={layout} />
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Bold, italic and page breaks carry across. Tables, images and embedded objects are not reproduced.
          </p>
        </>
      }
    />
  )
}
