import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { pdfForAi } from '@/ops/pdf/text'
import { meta } from './meta'

const SIZES = [
  { value: '2000', label: 'Small' },
  { value: '4000', label: 'Medium' },
  { value: '8000', label: 'Large' },
]

export default function PdfForAiTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [chunkChars, setChunkChars] = useState('4000')

  const run = () =>
    job.run(async (progress) => {
      const out = []
      for (const file of files.list) {
        out.push(...(await pdfForAi(file, { chunkChars: Number(chunkChars) }, progress)))
      }
      return out
    })

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="MAKE MARKDOWN"
      onRun={run}
      footnote="The text never leaves your machine; you decide where to paste it"
      settings={
        <>
          <Field label="Chunk size">
            <Segmented
              label="Chunk size"
              value={chunkChars}
              onChange={setChunkChars}
              options={SIZES}
            />
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Produces a markdown file with a heading per chunk, each labelled with the pages it came
            from. Chunks break on paragraph boundaries, so sentences stay whole.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Smaller chunks suit question answering; larger ones keep more context together.
          </p>
        </>
      }
    />
  )
}
