import { useEffect, useRef, useState } from 'react'
import { Field } from '@/components/console/Field'
import { Panel } from '@/components/console/Panel'
import { ToolLayout } from '@/components/tool/ToolLayout'
import { useToolFiles } from '@/components/tool/useToolFiles'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useFileJob } from '@/lib/useFileJob'
import { extractText } from '@/ops/pdf/text'
import { cn } from '@/lib/utils'
import { meta } from './meta'

export default function ReadAloudTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()
  const [pages, setPages] = useState<{ file?: File; text: string[] }>({ text: [] })
  const [spoken, setCurrent] = useState<{ file?: File; index: number }>({ index: 0 })
  const [rate, setRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const file = files.list[0]

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const text = pages.file === file ? pages.text : []
  // playback position belongs to the file it started on
  const current = spoken.file === file ? spoken.index : 0

  // stop speaking when the tool is closed or the file changes
  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  useEffect(() => {
    window.speechSynthesis?.cancel()
  }, [file])

  const load = () =>
    job.run(async (progress) => {
      const extracted = await extractText(file, progress)
      setPages({ file, text: extracted })
      return [
        {
          file: new File([extracted.join('\n\n')], `${file.name.replace(/\.pdf$/i, '')}.txt`, {
            type: 'text/plain',
          }),
          sourceName: file.name,
          sourceSize: file.size,
          note: `${extracted.length} pp`,
        },
      ]
    })

  const speak = (index: number) => {
    if (!supported || !text[index]) return
    window.speechSynthesis.cancel()
    const next = new SpeechSynthesisUtterance(text[index])
    next.rate = rate
    next.onend = () => {
      if (index + 1 < text.length) {
        setCurrent({ file, index: index + 1 })
        speak(index + 1)
      } else {
        setSpeaking(false)
      }
    }
    utterance.current = next
    window.speechSynthesis.speak(next)
    setSpeaking(true)
    setCurrent({ file, index })
  }

  const stop = () => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  const workbench = text.length ? (
    <Panel
      label="C · Pages"
      tone="deep"
      meta={
        <span className={speaking ? 'text-primary' : 'text-dim'}>
          {speaking ? `Reading page ${current + 1}` : `${text.length} pages ready`}
        </span>
      }
    >
      <div className="mt-3.5 flex flex-wrap gap-2">
        {!supported && (
          <p className="font-sans text-[12.5px] text-egress">
            This browser has no speech synthesis, so only the text export works.
          </p>
        )}
        {text.map((page, index) => (
          <button
            key={index}
            type="button"
            disabled={!supported || !page}
            onClick={() => speak(index)}
            title={page.slice(0, 120) || 'No text on this page'}
            className={cn(
              'h-10 w-10 border text-[11px] transition-colors disabled:opacity-40',
              index === current && speaking
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-line-soft bg-well text-dim hover:border-primary hover:text-foreground',
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <p className="mt-3 font-sans text-[12px] leading-relaxed text-faint">
        Pages with no selectable text are greyed out; a scan has pictures of words, not words.
      </p>
    </Panel>
  ) : undefined

  return (
    <ToolLayout
      meta={meta}
      files={files}
      job={job}
      compareSizes={false}
      workbench={workbench}
      runLabel="READ THE FILE"
      onRun={load}
      canRun={Boolean(file)}
      footnote="The voice runs inside your browser; nothing is streamed anywhere"
      settings={
        <>
          <Field label="Speed" aside={`${rate.toFixed(1)}x`}>
            <Slider
              min={0.5}
              max={2}
              step={0.1}
              value={[rate]}
              onValueChange={([v]) => setRate(v)}
              aria-label="Speech rate"
            />
          </Field>

          <div className="flex gap-2">
            <Button
              onClick={() => speak(current)}
              disabled={!supported || !text.length || speaking}
              className="flex-1 tracking-[0.1em]"
            >
              PLAY
            </Button>
            <Button
              variant="outline"
              onClick={stop}
              disabled={!speaking}
              className="tracking-[0.1em]"
            >
              STOP
            </Button>
          </div>

          <p className="font-sans text-[12.5px] leading-relaxed text-soft">
            Press "read the file" to pull the text out, then play. Click any page number to jump
            there. Reading continues to the end of the document.
          </p>
        </>
      }
    />
  )
}
