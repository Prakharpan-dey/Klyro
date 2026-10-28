# Klyro

**A privacy-first file toolkit that runs in your browser.** 80 tools for images, PDFs and video, all of them running inside the browser tab. No upload endpoint, no server, no account, no tracking.

[![CI](https://github.com/Prakharpan-dey/Klyro/actions/workflows/ci.yml/badge.svg)](https://github.com/Prakharpan-dey/Klyro/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
![Off-origin requests](https://img.shields.io/badge/off--origin%20requests-0-brightgreen)

**[Try it](https://klyro.zeusdotdev.app)** · [Quick start](#quick-start) · [Adding a tool](#adding-a-tool) · [Deploy your own](#deploy-your-own) · [Contributing](#contributing)

---

## Why this exists

Every exam form, scholarship portal and government submission wants files a specific way. *"Photo: JPG, 20–50 KB. Signature: 10–20 KB. Marksheet: one PDF under 300 KB."*

The usual answer is to search "compress pdf online", open the first ad-filled result, and upload a marksheet, an identity document or a signature to a server nobody knows anything about — often from a shared machine, minutes before a deadline. The file stays on someone else's disk indefinitely.

None of that work needs a server. Browsers can already do all of it. Klyro does the whole job locally, and nothing about your files leaves the machine: not the file, not its name, not its size.

## Tools

| Group | Tools |
|---|---|
| **Image** (9) | Compress to an exact KB target, resize by px, percent or **cm at a chosen DPI** (the 3.5 × 4.5 cm photo forms ask for), convert between JPG, PNG, WebP and AVIF, crop, rotate and flip, watermark, HEIC to JPG, SVG to PNG, and see and remove what a photo records about you |
| **Video** (8) | Compress to a target size with a live estimate, trim with a scrubbing preview, rotate, resize, convert between MP4 and WebM, mute or extract the audio, save the sound as MP3, turn a clip into a GIF |
| **Pages** (15) | Merge, split, organize by thumbnail, rotate, delete, extract, reverse, insert blanks, alternate and mix, crop, fix page size, N-up, booklet, divide, overlay |
| **Stamps** (7) | Edit PDF (add text, pictures, shapes and whiteout), highlight and note, page numbers, watermark, header and footer, Bates numbering, and a signature you draw, type or photograph, then drag onto the page |
| **Optimise** (6) | Compress to a KB target, rasterize, colour filters, remove blank pages, repair, linearize for fast web view |
| **Convert** (21) | Word, Excel, CSV, ODT, ODS, EPUB, HTML, RTF, text, images and a ZIP of images to PDF; PDF to Word, Excel, PowerPoint, images and text; images to PowerPoint; extract the images inside a PDF; chunked markdown for an LLM; camera scan; OCR a scan into a searchable PDF |
| **Inspect** (8) | Compare two PDFs by text and by pixel, view and edit metadata, remove annotations, flatten, fill forms, read aloud, in-page viewer |
| **Secure** (6) | Redact, privacy check that removes what it finds and then proves it, AES-256 encrypt, decrypt a file you have the password for, sign with a certificate, check an existing signature |

Every tool is one click away in the left rail, with a filter that narrows 80 down to a handful as you type, or `Ctrl`/`⌘ K` for the command palette. The *All tools* page lists them by group; drop files on it first and it shows only the tools that can take them, with the files already loaded.

Two behaviours worth knowing because most tools get them wrong:

- **Compression never returns something heavier than what it was given.** If a format cannot beat the original, the original is kept and the tool says why.
- **Metadata removal does not cost quality.** Re-encoding an image drops EXIF as a side effect; *Photo Privacy* instead rewrites the container around the same pixel data, so the picture comes out bit for bit identical with only the metadata gone.

## How the privacy claim holds

"We respect your privacy" is easy to write and hard to verify. Here is what makes it checkable in this repository:

1. **There is no upload endpoint.** Images go through canvas and Web Workers; PDFs through pdf-lib and pdf.js; video through WebCodecs. Read `web/src/ops/` and you will not find a request that carries file bytes.
2. **The browser enforces it.** The site ships a Content-Security-Policy whose `connect-src` allows only the site itself, so even a bug or a malicious dependency could not post a file anywhere.
3. **There is no server to send anything to.** The site is static files. There is no backend, no API and no log of what anyone does with it.
4. **Nothing is stored.** Staged files live in tab memory and disappear when the tab closes. Output is written only when you press save.
5. **Even the OCR engine is local.** Tesseract normally pulls its WebAssembly and language models from a CDN; a build step copies both out of `node_modules` into the site, so the only thing fetched is a file from this origin.
6. **The camera is the one permission the site requests**, and only the Scan tool uses it. `Permissions-Policy` allows `camera=(self)` and denies microphone, geolocation and payment outright.
7. **No analytics, no ads, no third-party fonts.** Fonts are served from the site itself. The status bar shows a live count of off-origin requests, and it stays at zero.

## Quick start

Node 22+.

```bash
git clone https://github.com/Prakharpan-dey/Klyro.git
cd Klyro/web
npm install
npm run dev            # http://localhost:5173
```

That is the whole app; there is no backend to run.

Useful commands:

```bash
npm test               # 336 tests
npm run lint           # oxlint
npm run typecheck      # tsc -b
npm run build
npm run preview        # serves the production build under the real CSP
```

`npm run preview` is worth knowing about: it serves the built site with the same Content-Security-Policy the deployed site sends, read straight out of `customHttp.yml`. Anything that would be blocked in production is blocked there.

## Project structure

```
web/                     the app; everything that touches a file lives here
  src/ops/               pure operations, no React
    image/               canvas + Web Worker pool
    pdf/                 pdf-lib, pdf.js, qpdf (WASM), tesseract, node-forge
    office/              .docx and .xlsx readers and writers, built on jszip
    video/               WebCodecs via mediabunny
  src/tools/<slug>/      one folder per tool: meta.ts + Tool.tsx
  src/components/
    console/             the design system: Panel, Field, Segmented, Dropzone…
    tool/                ToolLayout and the intake/settings/output shell
    layout/              app shell, left rail, command palette
  scripts/               build-time asset staging (the OCR engine)
infra/budget.yaml        an optional AWS spending alarm
customHttp.yml           the production CSP and security headers
amplify.yml              monorepo build spec
```

The split that matters: **`ops/` never imports React, and components never contain file logic.** That is what makes the operations testable in Node and the privacy claim readable — all file handling is in one directory.

## Adding a tool

A tool is a folder. Drop `meta.ts` and `Tool.tsx` into `web/src/tools/<slug>/` and it registers itself — `registry.ts` picks it up with `import.meta.glob`, and it appears in the rail, the command palette and the router with no wiring.

```ts
// web/src/tools/pdf-example/meta.ts
import { PDF_ACCEPT, type ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'pdf-example',
  code: 'PDF-49',            // unique; a test fails if it is not
  title: 'Example',
  summary: 'One sentence, shown in the rail and the palette.',
  category: 'pdf',
  group: 'Pages',            // must exist in toolGroups, or a test fails
  accept: PDF_ACCEPT,
  multiple: true,
}
```

```tsx
// web/src/tools/pdf-example/Tool.tsx
export default function ExampleTool() {
  const files = useToolFiles(meta.accept, meta.multiple)
  const job = useFileJob()

  const run = () => job.run((progress) => doTheWork(files.list, progress))

  return <ToolLayout meta={meta} files={files} job={job} runLabel="RUN" onRun={run} settings={…} />
}
```

`ToolLayout` provides intake, settings, an optional workbench panel and the output list with per-file save and a zip. `useFileJob` owns progress, errors, cancellation and the toast. The operation itself belongs in `src/ops/`, returns `OutputFile[]`, and gets its own tests.

## Architecture

```
BROWSER (everything)                                 HOSTING
──────────────────────────────────────────           ─────────────────────────────
tool pages ─► ops/                                   AWS Amplify Hosting
                image worker pool (OffscreenCanvas)    static files + security headers
                pdf-lib · pdf.js · qpdf                rebuilds on every push
                tesseract · WebCodecs · mediabunny
```

There is no backend. The host serves files and the headers in `customHttp.yml`; every operation runs in the visitor's browser.

## Deploy your own

The frontend is a static site: any host will serve it, but it **must** send the headers in `customHttp.yml`, because the CSP is load-bearing rather than decorative.

On AWS Amplify, connect the repository as a monorepo app with app root `web` and add the SPA rewrite to `/index.html`.

Optionally, a spending alarm for the AWS account, deployed as its own stack:

```bash
aws cloudformation deploy --template-file infra/budget.yaml --stack-name klyro-budget --parameter-overrides AlertEmail=you@example.com MonthlyLimit=5
```

It mails at half the limit, at the limit, and as soon as the month's forecast crosses it. AWS sends a confirmation mail to that address first.

Running costs are bandwidth and nothing else, because nothing is processed server-side: a visit is about 312 KB, and the OCR engine adds ~4.3 MB the first time someone uses it.

## Testing

```bash
cd web && npm test        # 336 tests
```

Tests run in Node, so anything needing a canvas, a worker or WebCodecs is verified by hand in the browser instead. Two of the unit tests exist to catch failures that would otherwise be silent: that every tool reaches the index, and that the third-party engines still export what the code calls.

The standard of evidence this project tries to hold itself to — worth matching in a pull request:

- **Output is inspected, not counted.** Merged, split, reordered and rotated PDFs are rendered back to images and looked at page by page.
- **Claims are tested against something other than the code that made them.** A signed PDF's detached PKCS#7 blob goes to `openssl cms -verify`; the generated `.xlsx` is opened with openpyxl; the `.docx` is parsed as OOXML.
- **"Removed" means removed from the bytes.** Stripping a PDF used to unlink data and leave it in the file, then re-run its own scanner on its own output — a check that can only confirm what it already knows. The output is now decompressed with qpdf and searched for the exact values the input recorded, in each form a PDF can store text. One test builds a half-stripped file and asserts the name **is** still findable there, because a negative assertion nobody has seen fail is not a test.
- **Pixel claims are measured.** Cleaning a photo's metadata changed **0 of 5,600,000 subpixels**. Adding an OCR text layer changed none either. A signature placed once and applied to a portrait page, a landscape page and a page rotated 90° landed at centre (0.685, 0.823) on all three, upright.
- **The production CSP is exercised locally.** `npm run preview` serves the build with the deployed headers; the WASM engines and the video preview are checked there, not only in dev.

## Notes on the tricky parts

Collected while building; useful before touching the same areas.

- **Deleting a key from a PDF does not delete anything.** pdf-lib writes out every object it was ever told about, so an "erased" attachment stays in the file. qpdf — already in the bundle — rebuilds from what is reachable, which drops the rest.
- **Text in a PDF is usually not the text you typed.** Document information is stored as UTF-16BE hex with a byte-order mark, so a plain search for an author's name finds nothing whether or not the name is there.
- **A fixed step is the wrong way to hit a size target.** Shrinking by 15% ten times left a PNG both smaller on screen *and* larger on disk. File size follows pixel count, so scaling by the square root of the overshoot lands on target in two passes.
- **A signed PDF signs itself around a hole.** The signature dictionary reserves space, the byte range covers everything except that hole, and the blob is written into it afterwards.
- **`.docx` and `.xlsx` are zip archives of XML.** Writing them by hand with the zip library already in the bundle costs about 200 lines and no new dependency.
- **`new Quality(1_200_000)` in mediabunny is a quality *level*, not a bitrate** — the bitrate has to be named (`new Quality({ bitrate })`). A test now fails if the two are confused.
- **pdf.js renders with `requestAnimationFrame`**, which browsers pause in background tabs; exports stall until you switch to the print intent.
- **A monorepo Amplify app rejects a plain `customHeaders:` file** — it needs the `applications:` / `appRoot:` wrapper.

## Known limitations

- **Video needs WebCodecs** — Chrome, Edge and Safari 16.4+ have it; older browsers do not. The tool checks first and says so rather than failing halfway. HEVC (iPhone `.mov`) decoding also depends on the machine, and is checked per file.
- **A phone is a small computer.** Video is capped at 500 MB with a warning above 200 MB, because a mobile tab is killed long before a desktop one runs out of room.
- **A size target in PNG costs picture, not quality.** PNG has no quality dial, so the only way down is fewer pixels. JPG and WebP reach the same target at full size.
- **PDF compression re-renders the pages**, so the file shrinks but text stops being selectable.
- **PDF to Word carries text, not layout.** A PDF stores glyphs at coordinates; paragraphs, tables and images do not survive.
- **PDF to Excel is a heuristic** — rows from a shared baseline, columns from a shared left edge. Merged cells and wrapped lines are where it slips.
- **Scanned pages hold pictures of words**, so text tools come back empty until OCR runs. OCR reads printed English and Hindi; handwriting is beyond it.
- **A drawn signature is not a cryptographic one.** *Sign PDF* puts a picture on the page; *Digital Signature* is the one that can be verified. Both say so on screen.
- **A verified signature proves the file is unchanged, not who signed it.** That depends on the issuing certificate authority, so it is reported rather than judged, and self-signed certificates are labelled.
- **JPEG 2000 images inside PDFs** may render blank in thumbnails and exports, because pdf.js needs extra decoder files for them.

## Roadmap

Reasonable places to start contributing:

- Presets for common exam and government form requirements, each linked to its official source
- Offline support with a service worker
- A frame grab from a video, audio-only compression, merging clips
- Edit bookmarks, deskew crooked scans, split a PDF by size or by bookmark
- More OCR languages (the build script stages them; adding one is a few lines)

## Contributing

Issues and pull requests are welcome, including small ones. [CONTRIBUTING.md](CONTRIBUTING.md) has the details; the short version:

**The one rule that is not negotiable:** nothing in `web/src/ops/` may send file contents anywhere. A change that adds a request carrying file bytes, or that would require loosening `connect-src` in `customHttp.yml`, defeats the point of the project and will not be merged. Engines that would otherwise fetch from a CDN get vendored at build time instead — `web/scripts/ocr-assets.mjs` is the pattern.

Beyond that: run `npm run lint`, `npm run typecheck` and `npm test` before opening a PR (all three are clean on `main`), put operations in `src/ops/` with tests and UI in a tool folder, prefer what is already in the bundle over a new dependency, and write conventional one-line commit messages.

Found a way to make file data leave the browser? That is a security issue, not a bug report — see [SECURITY.md](SECURITY.md) and please report it privately.

By taking part you agree to the [code of conduct](CODE_OF_CONDUCT.md).

## Built with

[pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) · [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) · [qpdf](https://github.com/qpdf/qpdf) via [@neslinesli93/qpdf-wasm](https://github.com/neslinesli93/qpdf-wasm) (ISC) · [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0) · [mediabunny](https://mediabunny.dev) (MPL-2.0) · [node-forge](https://github.com/digitalbazaar/forge) (BSD-3-Clause) · [JSZip](https://stuk.github.io/jszip/) (MIT) · React, Vite, Tailwind CSS, shadcn/ui, cmdk.

Every one of these is compatible with the AGPL: the permissive ones by definition, and mediabunny because its source carries no "Incompatible With Secondary Licenses" notice, which is what MPL-2.0 section 3.3 requires. See [NOTICE](NOTICE) for the full list.

## History

Klyro began as an entry to a WeMakeDevs hackathon on AWS. That version also had an optional command bar on Amazon Bedrock that turned a typed sentence into a chain of tools. It was taken out after the hackathon so the site could have no backend at all; the code is still in the git history from before its removal.

## License

[GNU Affero General Public License v3.0 or later](LICENSE).

**What this means for you:**

- ✅ You may **use, study and modify** this software freely, for any purpose, including commercially.
- ✅ You may **distribute** copies, original or modified.
- ⚠️ If you distribute a modified version, you must **release your source** under the same licence.
- ⚠️ If you **run a modified version as a website or service**, you must offer its source to the people using it — even though you never hand them a copy of the program. That is section 13, and it is the reason this is AGPL rather than GPL.
- ⚠️ You must **keep the copyright notice and licence** with the code, and state what you changed.

The point is narrow: Klyro's promise is that your files never leave your machine, and that promise is only as good as the source you can read. Anyone is free to take this further — they just cannot take it private.

In practice, that means a fork you deploy has to tell its users where to get its source. The unmodified upstream is this repository, which is public.
