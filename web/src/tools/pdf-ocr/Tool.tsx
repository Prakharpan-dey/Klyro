import { useState } from 'react'
import { Field } from '@/components/console/Field'
import { Segmented } from '@/components/console/Segmented'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { useFileJob } from '@/lib/useFileJob'
import { runOcr, type OcrLanguage, type OcrParams } from '@/ops/pdf/ocr'
import { meta } from './meta'

export default function OcrTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [language, setLanguage] = useState<OcrLanguage>('eng')
  const [dpi, setDpi] = useState(200)
  const [output, setOutput] = useState<OcrParams['output']>('searchable')

  const run = () => job.run((progress) => runOcr(files.list, { language, dpi, output }, progress))

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      runLabel="READ IT"
      onRun={run}
      intakeHint="Scanned PDFs and photos of documents both work."
      footnote="The first run downloads the language model, then it is kept for next time."
      settings={
        <>
          <Field label="Language">
            <Segmented
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'eng', label: 'English' },
                { value: 'hin', label: 'Hindi' },
                { value: 'eng+hin', label: 'Both' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {language === 'eng+hin'
                ? 'Both models load, which is slower but handles mixed pages'
                : 'Pick what is actually on the page; a wrong guess reads as nonsense'}
            </p>
          </Field>

          <Field label="Output">
            <Segmented
              label="Output"
              value={output}
              onChange={setOutput}
              options={[
                { value: 'searchable', label: 'Searchable PDF' },
                { value: 'text', label: 'Text file' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {output === 'searchable'
                ? 'The page looks unchanged; the words go behind it, invisible'
                : 'Plain text, in reading order, with no formatting'}
            </p>
          </Field>

          <Field label="Reading detail">
            <Segmented
              label="Reading detail"
              value={String(dpi)}
              onChange={(value) => setDpi(Number(value))}
              options={[
                { value: '150', label: 'Fast' },
                { value: '200', label: 'Balanced' },
                { value: '300', label: 'Careful' },
              ]}
            />
            <p className="readout text-[10px] text-faint">
              {dpi} dpi · small print and faint scans want the careful setting
            </p>
          </Field>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            A scan holds a picture of words, so nothing can search, copy or read it aloud. This
            reads the picture and puts the words back on the page as an invisible layer, which is
            what makes a scanned marksheet behave like a real document.
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-faint">
            Expect a minute or so per page, all of it in this tab. Handwriting is beyond it, and a
            crooked or shadowed photo reads worse than a flat one.
          </p>
        </>
      }
    />
  )
}
