# Contributing to Klyro

Thanks for taking a look. Issues and pull requests are both welcome, including small ones.

## The one rule

**Nothing in `web/src/ops/` may send file contents anywhere.**

A change that adds a request carrying file bytes, or that would need `connect-src` in `customHttp.yml` loosened, defeats the point of the project and will not be merged. This is the whole reason Klyro exists, so it is worth being blunt about.

That includes indirect routes:

- No analytics, error reporting or session replay, even the self-hosted kind.
- No CDN for fonts, engines or models. An engine that would normally fetch from a CDN gets vendored at build time instead — `web/scripts/ocr-assets.mjs` is the pattern to copy.
- No `<img src>`, `<script src>` or `fetch` pointing off-origin.

If a feature genuinely cannot work without a server, open an issue and describe it before writing code. The answer is not automatically no, but it has to be visible in the UI and in the privacy section of the README.

## Getting set up

Node 22+.

```bash
git clone https://github.com/Prakharpan-dey/Klyro.git
cd Klyro/web
npm install
npm run dev
```

The planner API in `api/` is optional. `MOCK_PLANNER=1` in `api/.env` answers with a keyword planner and needs no AWS account.

## Before you open a pull request

```bash
cd web
npm run lint          # oxlint
npm run typecheck     # tsc -b
npm test              # vitest
npm run build
```

All four are clean on `main`, and CI runs the same ones for `web/` and `api/`. If `npm run preview` is relevant to your change — anything touching workers, WASM, blobs or media — run that too: it serves the production build under the real Content-Security-Policy, which is where those break.

## How the code is arranged

- `web/src/ops/` — operations. Pure functions, no React, tested in Node. Everything that touches a file lives here.
- `web/src/tools/<slug>/` — one folder per tool: `meta.ts` and `Tool.tsx`. It self-registers; nothing else needs editing.
- `web/src/components/console/` — the design system. Reach for `Panel`, `Field`, `Segmented`, `Dropzone` before writing new chrome.
- `web/src/components/tool/ToolLayout.tsx` — the intake / settings / output shell every tool uses.

The README's [Adding a tool](README.md#adding-a-tool) section has a worked example.

## What a good change looks like

- **Operations come with tests.** Build a real input with pdf-lib or a canvas, run the operation, and assert on what came out — page counts, byte contents, pixel values. Several existing tests decode the output and measure it rather than trusting the library that produced it.
- **Negative assertions get a control.** If you assert that something is *gone*, add a case proving the same assertion catches it when it is still there. A test nobody has seen fail is not a test.
- **Tools tell the truth on screen.** If an operation approximates, degrades quality or cannot meet the request, say so in the UI before it runs — not only in a warning afterwards. PDF to Excel, PDF compression and PNG size targets all do this.
- **Prefer what is already in the bundle.** pdf-lib, pdf.js, qpdf, jszip, tesseract, mediabunny and node-forge cover a lot. When a new dependency is genuinely the right call, say why in the PR, and check its licence is compatible with AGPL-3.0 (permissive ones are; another strong copyleft may not be).
- **Match the surrounding code.** Comments explain *why*, not *what*. The UI writes in plain sentences, not marketing.

## Commits

Conventional one-liners, lower case:

```
feat: add a tool that splits a PDF by bookmark
fix: stop image compression returning a bigger file than it was given
test: cover indirect references in the privacy scan
docs: explain the placement maths
chore: bump tesseract
refactor: share the page-range parser
```

One concern per commit where practical — it makes the history readable and a bad change easy to back out.

## Licensing of contributions

Klyro is licensed under the [GNU AGPL v3](LICENSE). Anything you contribute is
offered under the same licence — the usual inbound-equals-outbound arrangement,
with no separate agreement to sign.

One consequence worth understanding before you build on this: if you run a
modified Klyro and let other people use it, section 13 requires you to offer
them its source, even though you never hand out a copy of the program itself.
That is deliberate. A tool whose entire promise is "your files stay on your
machine" should not be quietly forkable into one that breaks the promise.

## Reporting a security or privacy problem

Please do not open a public issue. See [SECURITY.md](SECURITY.md).
