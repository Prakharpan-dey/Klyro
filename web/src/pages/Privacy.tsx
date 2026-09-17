import { Panel } from '@/components/console/Panel'

const points = [
  {
    title: 'Files stay in the tab',
    body: 'Images and PDFs are read, processed and written inside your browser using Web Workers and canvas. There is no upload endpoint in this app.',
  },
  {
    title: 'Nothing is stored',
    body: 'Staged files live in memory for this tab only. Close the tab and they are gone. Output is only written when you press save.',
  },
  {
    title: 'Metadata is stripped',
    body: 'Re-encoded images drop EXIF blocks, including camera details and GPS location.',
  },
  {
    title: 'One request can leave',
    body: 'The optional planner sends your typed instruction plus file type, size and page count — never file contents, and file names only if you allow it.',
  },
  {
    title: 'No tracking',
    body: 'No analytics, no ads, and fonts are served from this site instead of a third-party CDN.',
  },
]

export function Privacy() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="max-w-[76ch] border-l border-line pl-5">
        <div className="label text-primary">Privacy model</div>
        <h1 className="mt-4 font-sans text-[30px] leading-tight font-medium tracking-[-0.025em]">
          What leaves your machine
        </h1>
        <p className="mt-3 font-sans text-[14.5px] leading-relaxed text-soft">
          Short answer: your files don&apos;t. Here is exactly how that works.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {points.map((p, i) => (
          <Panel key={p.title} label={`${String(i + 1).padStart(2, '0')} · ${p.title}`}>
            <p className="mt-3.5 font-sans text-[13.5px] leading-relaxed text-soft">{p.body}</p>
          </Panel>
        ))}
      </div>
    </div>
  )
}
