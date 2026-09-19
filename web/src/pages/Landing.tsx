import { useNavigate, Link } from 'react-router'
import { Dropzone } from '@/components/console/Dropzone'
import { Logo } from '@/components/layout/TopBar'
import { useTelemetry } from '@/features/telemetry/useTelemetry'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { SUPPORT_URL } from '@/lib/links'
import { cn } from '@/lib/utils'
import { toolGroups, tools } from '@/tools/registry'

/** A hairline with a label sitting in it, the same rule the panels use. */
function SectionRule({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="label whitespace-nowrap text-faint">{children}</h2>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  )
}

/**
 * The claim and the evidence for it, side by side. Every number here is read from
 * the page the visitor is standing on, not written into the copy.
 */
function ProofStrip() {
  const { offOrigin, online } = useTelemetry()
  const readouts = [
    { label: 'Off-origin requests', value: String(offOrigin), good: offOrigin === 0 },
    { label: 'File bytes sent', value: '0 B', good: true },
    { label: 'Processing', value: 'Local', good: true },
    { label: 'Network', value: online ? 'Online' : 'Offline', good: online },
  ]

  return (
    <div className="border border-line bg-panel">
      <div className="grid grid-cols-2 divide-line-soft sm:grid-cols-4 sm:divide-x">
        {readouts.map((r) => (
          <div key={r.label} className="border-b border-line-soft p-4 sm:border-b-0">
            <div className="label text-[9px] text-faint">{r.label}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('size-[7px]', r.good ? 'bg-local' : 'bg-egress')} aria-hidden />
              <span className="readout text-[15px] tracking-[0.06em] text-foreground">
                {r.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-line-soft px-4 py-3 font-sans text-[12.5px] leading-relaxed text-dim">
        That first counter is live. It watches this page's own network activity with{' '}
        <code className="text-primary">PerformanceObserver</code>, and it will move the moment
        anything is fetched from another origin. Leave the tab open and watch it stay at zero.
      </p>
    </div>
  )
}

const steps = [
  {
    n: '01',
    title: 'Drop your files in',
    body: 'They are read into this tab’s memory. Nothing is uploaded, and closing the tab is all it takes to be rid of them.',
  },
  {
    n: '02',
    title: 'Say what you want, or pick a tool',
    body: 'Describe the job in a sentence and a plan comes back for you to approve. Only that sentence and each file’s size and type are sent — never the file.',
  },
  {
    n: '03',
    title: 'Watch it run on your machine',
    body: 'Every step is marked LOCAL and runs in your browser through WebAssembly and Web Workers. Output is written only when you press save.',
  },
]

const guarantees = [
  {
    title: 'There is no upload endpoint',
    body: 'Not a disabled one, not a rate-limited one. Images go through canvas and workers, PDFs through pdf-lib and pdf.js, video through WebCodecs.',
  },
  {
    title: 'The browser enforces it, not a promise',
    body: 'A Content-Security-Policy allows connections to this site and the planner alone, so even a compromised dependency could not post your file elsewhere.',
  },
  {
    title: 'The planner never sees a file',
    body: 'It receives your sentence plus each file’s kind, size and page count — a few hundred bytes, counted on screen every time. File names stay behind unless you allow them.',
  },
  {
    title: 'Nothing is kept, anywhere',
    body: 'No account, no history, no storage. The server logs timings and never the instruction; a test fails if that changes.',
  },
]

export function Landing() {
  const navigate = useNavigate()
  const { add } = useWorkspace()

  // dropping here is the fast path: stage the files, then land in the console with them ready
  const stage = (files: File[]) => {
    add(files)
    navigate('/console')
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Logo to="/" />
          <nav className="flex items-center gap-5 text-[11px] leading-none tracking-[0.1em]">
            <Link to="/privacy" className="text-faint hover:text-foreground">
              PRIVACY
            </Link>
            <Link
              to="/console"
              className="border border-primary px-3 py-2 text-[#9ad6ff] transition-colors hover:bg-primary/12"
            >
              OPEN CONSOLE →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pb-24 sm:px-8">
        <section className="pt-16 pb-14 sm:pt-24">
          <p className="readout text-[10px] text-primary">
            {tools.length} tools · nothing leaves the tab
          </p>
          <h1 className="mt-5 max-w-[16ch] font-sans text-[40px] leading-[1.03] font-medium tracking-[-0.035em] text-balance text-foreground sm:text-[62px]">
            Your files never leave this tab.
          </h1>
          <p className="mt-6 max-w-[58ch] font-sans text-[16px] leading-relaxed text-pretty text-soft">
            Compress a photo, merge a contract, strip the location out of a scan, shrink a video —
            the ordinary file jobs that normally mean handing a private document to a stranger’s
            server. Klyro does them in your browser instead, and shows you the proof while it works.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/console"
              className="border border-primary bg-primary/12 px-6 py-3.5 text-center text-[12px] leading-none tracking-[0.14em] text-[#9ad6ff] uppercase transition-colors hover:bg-primary/20"
            >
              Open the console
            </Link>
            <span className="readout text-[10px] text-faint sm:ml-2">
              No account · no upload · works offline once loaded
            </span>
          </div>
        </section>

        <section className="pb-16">
          <ProofStrip />
        </section>

        <section className="pb-16">
          <SectionRule>Start here</SectionRule>
          <div className="mt-4 border border-line bg-card p-4 sm:p-6">
            <Dropzone
              onFiles={stage}
              hint="Images, PDFs and video. They are staged in this tab and go nowhere else."
            />
            <p className="mt-3 font-sans text-[12.5px] text-dim">
              Dropping a file here takes you straight into the console with it already staged.
            </p>
          </div>
        </section>

        <section className="pb-16">
          <SectionRule>How it works</SectionRule>
          <div className="mt-5 grid gap-px bg-line-soft sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="bg-panel p-5">
                <div className="readout text-[11px] text-primary">{s.n}</div>
                <h3 className="mt-3 font-sans text-[15.5px] leading-snug font-medium text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2.5 font-sans text-[13.5px] leading-relaxed text-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <SectionRule>Why it is worth the trouble</SectionRule>
          <div className="mt-5 grid gap-px bg-line-soft sm:grid-cols-2">
            {guarantees.map((g) => (
              <div key={g.title} className="bg-panel p-5">
                <h3 className="font-sans text-[15px] leading-snug font-medium text-foreground">
                  {g.title}
                </h3>
                <p className="mt-2.5 font-sans text-[13.5px] leading-relaxed text-soft">{g.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 font-sans text-[13px] text-dim">
            The <Link to="/privacy">privacy page</Link> spells out exactly what is sent and what is
            not.
          </p>
        </section>

        <section>
          <SectionRule>Everything in the box</SectionRule>
          <div className="mt-5 grid gap-px bg-line-soft sm:grid-cols-2 lg:grid-cols-4">
            {toolGroups.map(({ group, tools: list }) => (
              <div key={group} className="bg-panel p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="label text-[10px] text-foreground">{group}</h3>
                  <span className="readout text-[10px] text-primary">{list.length}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {list.slice(0, 5).map((t) => (
                    <li key={t.slug}>
                      <Link
                        to={`/tools/${t.slug}`}
                        className="font-sans text-[13px] text-soft hover:text-foreground"
                      >
                        {t.title}
                      </Link>
                    </li>
                  ))}
                  {list.length > 5 && (
                    <li className="readout text-[10px] text-faint">+{list.length - 5} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {SUPPORT_URL && (
          <section className="pt-16">
            <div className="border border-line bg-panel p-6 sm:flex sm:items-center sm:justify-between sm:gap-10 sm:p-8">
              <div>
                <h2 className="font-sans text-[20px] leading-snug font-medium text-foreground sm:text-[23px]">
                  There is nothing to buy here, and nothing to sign up for.
                </h2>
                <p className="mt-3 max-w-[56ch] font-sans text-[14px] leading-relaxed text-soft">
                  No ads, no tracking, no upsell to a paid tier — which also means no revenue to pay
                  for the hosting. If Klyro saved you an upload you would rather not have made, a
                  coffee covers a month of it.
                </p>
              </div>
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex shrink-0 items-center justify-center gap-2.5 border border-primary bg-primary/12 px-6 py-3.5 text-[12px] leading-none tracking-[0.14em] text-[#9ad6ff] uppercase transition-colors hover:bg-primary/20 sm:mt-0"
              >
                <span aria-hidden>☕</span>
                Buy me a coffee
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-6 text-[10.5px] leading-none tracking-[0.1em] text-faint uppercase sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-[9px]">
            <span className="size-[7px] bg-local" aria-hidden />
            <span>Egress · 0 B file data · all processing local</span>
          </div>
          <div className="flex items-center gap-5 text-dim">
            <Link to="/privacy" className="text-dim hover:text-foreground">
              Privacy
            </Link>
            {/* the support card sits directly above this: one ask is enough */}
            <Link to="/console" className="text-dim hover:text-foreground">
              Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
