import { SheetFields } from '@/components/tool/SheetFields'
import { useSheetParams } from '@/components/tool/useSheetParams'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { odsToPdf } from '@/ops/office/odfToPdf'
import { meta } from './meta'

export default function OdsToPdfTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const sheet = useSheetParams()

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) out.push(await odsToPdf(file, sheet.params, progress))
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
      footnote="Values as they are stored: no colours, no charts, no formulas"
      settings={
        <>
          <SheetFields sheet={sheet} />
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Every sheet starts on a new page. Columns too wide for the paper are trimmed with an
            ellipsis, so nothing silently runs off the edge. Formulas are printed as the value they
            last held.
          </p>
        </>
      }
    />
  )
}
