# Klyro

**A file toolkit that never uploads your files.** Compress, resize, convert, merge, split and reorganise images and PDFs entirely inside your browser, and describe the job in plain language instead of hunting for the right tool.

🔗 **Live:** https://main.d21hq3du8p25uu.amplifyapp.com
🔌 **Planner API:** https://bpnrtqfqtc.execute-api.ap-south-1.amazonaws.com

---

## Why I built this

Every exam form, scholarship portal and college submission wants files a specific way. "Photo: JPG, 20–50 KB. Signature: 10–20 KB. Marksheet: one PDF under 300 KB."

So we do what everyone does: search "compress pdf online", open the first ad-filled site, and upload a marksheet, an Aadhaar card or a signature to a server we know nothing about. I have done it in a cyber café, on a shared machine, minutes before a deadline. The file sits on someone else's disk forever, and nobody reads the privacy policy at 11pm the night before a form closes.

The work itself is not hard. Browsers can already do all of it. The uploading was never necessary.

Klyro does the whole job locally. The only thing that can leave your machine is one short sentence describing what you want done, and even that is optional: every tool works on its own.

## What it does

| Code | Tool | Notes |
|---|---|---|
| IMG-01 | Compress | Quality slider, or an exact KB target reached by searching quality and, if needed, dimensions |
| IMG-02 | Resize | px, percent, or **cm at a chosen DPI** (for the 3.5 x 4.5 cm photo every form wants) |
| IMG-03 | Convert | JPG, PNG, WebP |
| PDF-01 | Merge | Drag to reorder before joining |
| PDF-02 | Split | By ranges (`1-3, 4-`), every N pages, or pull pages into one file |
| PDF-03 | Organize | Page thumbnails: drag to reorder, rotate, delete |
| PDF-04 | Images to PDF | A4, Letter or fit-to-image, with margins |
| PDF-05 | PDF to images | Every page as JPG or PNG at 72 to 300 dpi |

Plus a **command bar**: type "merge these, remove page 3, under 500 KB" and the planner returns steps, which are shown for approval and then executed locally.

Re-encoding also strips EXIF, so camera model and GPS coordinates do not travel with the photo you upload to a portal.

## How the privacy claim actually holds

This is the part I cared about most, because "we respect your privacy" is easy to write and hard to verify.

1. **There is no upload endpoint.** Images go through canvas and Web Workers; PDFs through pdf-lib and pdf.js. Look through `web/src/ops/` and you will not find a request that carries file bytes.
2. **The planner only receives metadata.** The request body is the instruction plus, per file, its kind, mime type, size in KB, and page count or pixel size. A typical request is about 200 bytes. File **names** are excluded unless you flip a switch.
3. **The browser enforces it.** The site ships a Content-Security-Policy whose `connect-src` allows only the site itself and the planner API. Even a bug or a malicious dependency could not post your file somewhere else.
4. **The server forgets.** The Lambda logs latency, file count, step count and token usage. It never logs the instruction or file names, and there is a test that fails if either leaks.
5. **Nothing is stored.** Staged files live in tab memory and disappear when you close it. Output is written only when you press save.
6. **No analytics, no ads, no third-party fonts.** Fonts are served from the site itself, so the page makes no off-origin requests at all. The console shows a live count of them, and it stays at zero until you ask for a plan.

## Architecture

```
BROWSER (everything that touches your files)        AWS (metadata only)
──────────────────────────────────────────         ─────────────────────────────────
tool pages ─┐                                       Amplify Hosting
command bar ┼─► ops/                                  static site + security headers
            │     image worker pool                   rebuilds on every push
            │     (OffscreenCanvas)                 API Gateway (HTTP API)
            │     pdf-lib · pdf.js                    CORS locked to the site
            │                                         throttled 5 rps / burst 10
            └─► plan executor ◄── plan JSON ──────  Lambda (Node 22, arm64, 256 MB)
                  validate → preview →                 validates, calls the model,
                  you press RUN → run locally          validates the answer
                                                    Amazon Bedrock (Converse API)
                                                      tool call returns the plan
```

**Why a plan instead of letting a model act.** The model never touches files and cannot invent operations. It returns a list of steps drawn from a fixed catalogue, checked twice with the same schema (once in the Lambda, once in the browser), then shown to you in plain language. Nothing runs until you press RUN. A prompt-injected instruction can at worst produce a plan you can see and reject.

## AWS services used

| Service | Role |
|---|---|
| **Amplify Hosting** | Builds `web/` from GitHub on push; serves the SPA with CSP, HSTS and cache headers from `customHttp.yml` |
| **API Gateway** (HTTP API) | Single `POST /plan` route, CORS restricted to the site, per-route throttling |
| **Lambda** | Node 22 on arm64, esbuild-bundled, 30 s timeout, 7-day log retention |
| **Amazon Bedrock** | Converse API with a tool definition; the model's only allowed reply is a plan |
| **CloudFormation / SAM** | The whole API is one template with parameters for model, origins and planner mode |
| **IAM** | Lambda may only call `bedrock:InvokeModel` on foundation models and inference profiles |
| **CloudWatch Logs** | Metrics-only structured logs |

## Running it locally

Requires Node 22+.

```bash
# web app
cd web
npm install
npm run dev            # http://localhost:5173

# planner API (optional; the tools work without it)
cd api
npm install
cp .env.example .env   # MOCK_PLANNER=1 needs no AWS credentials
npm run dev            # http://localhost:3001, proxied at /api
```

Useful commands:

```bash
npm test               # web: 40 tests · api: 16 tests
npm run lint
npm run typecheck
npm run build          # web: production build · api: esbuild bundle + sam build
npm run preview        # web: serves the production build with the real CSP
```

## Deploying

```bash
cd api
npm run build
sam deploy --guided                    # stack klyro-api in ap-south-1
```

The frontend is connected to Amplify as a monorepo app with app root `web`, environment variable `VITE_API_URL` pointing at the API, and the SPA rewrite to `/index.html`.

Template parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `ModelId` | `openai.gpt-oss-120b-1:0` | Any Bedrock model that supports Converse and tool use |
| `AllowedOrigins` | `http://localhost:5173` | Comma-separated list of origins allowed to call the API |
| `MockPlanner` | `0` | `1` answers with a keyword planner instead of calling a model |

## Testing

- **Unit tests** cover the page-range parser, the target-size search, PDF operations against real generated PDFs (page counts, order, rotation), plan validation, the plan executor, and that the API never logs sensitive strings.
- **Output verification:** merged, split, reordered and rotated PDFs were rendered back to images and inspected page by page, not just checked for page counts.
- **Live checks:** the production build runs under the deployed CSP with zero violations, and the network tab shows only the `/plan` request.

## Current limitation

Bedrock model invocation is blocked at the account level on my AWS account. Every model, every region, returns `ValidationException: Operation not allowed` while `GetFoundationModelAvailability` reports `authorizationStatus: NOT_AUTHORIZED`, which AWS documents as a security restriction cleared through a support case. That case is open.

So the deployed site currently runs with `MockPlanner=1`: the API answers with a small keyword planner, and the UI says so plainly ("planned by the API's keyword rules"). The Bedrock path is deployed, IAM-permitted and covered by tests; switching back is one parameter.

## What I learned

- Bedrock's Anthropic endpoint and the Converse API are different surfaces with different features. Structured outputs are not available on Bedrock, so the plan comes back as a **tool call** that I validate myself.
- `sam build`'s esbuild builder could not find esbuild on Windows, so bundling moved into an npm script and SAM now ships a prebuilt `dist/`.
- A monorepo Amplify app rejects a plain `customHeaders:` file; it needs the `applications:` / `appRoot:` wrapper.
- pdf.js schedules rendering with `requestAnimationFrame`, which browsers pause in background tabs. Exports stalled until I switched to the print intent.
- Writing a CSP first, then running the production build against it locally, catches problems that never appear in dev mode.

## Roadmap

- Video compression once the PDF and image paths are stable
- Presets for common exam and government form requirements, each linked to its official source
- Offline support with a service worker
- Optional OCR so scanned marksheets become searchable

## License

MIT. See [LICENSE](LICENSE).
