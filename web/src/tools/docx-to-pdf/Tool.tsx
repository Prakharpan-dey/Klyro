import { LayoutFields } from '@/components/tool/LayoutFields'
import { useLayoutParams } from '@/components/tool/useLayoutParams'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { docxToPdf } from '@/ops/office/docxToPdf'
import { meta } from './meta'

export default function DocxToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const layout = useLayoutParams()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) out.push(await docxToPdf(file, layout.params, progress))
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
      footnote="Text, headings and lists — not the original page design"
      settings={
        <>
          <LayoutFields layout={layout} />
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            The document is read for its text and laid out again here, so the result is clean but
            will not match Word page for page. Images, tables and columns are left behind.
          </p>
        </>
      }
    />
  )
}
