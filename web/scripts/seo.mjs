import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Writes the static surface a crawler sees, into dist/ after vite build.
 *
 * Every route in this app is the same index.html with an empty root, so search
 * engines and link previews get one title for fifty-eight URLs. This emits a
 * real HTML file per route — correct title, description, canonical, social tags
 * and a heading — plus robots.txt and sitemap.xml.
 *
 * It is string templating over the built index.html, not server rendering: the
 * tool components import pdf.js, canvas and WASM, none of which survive being
 * executed in node. The seeded markup is replaced by React on mount, which is
 * why main.tsx must keep using createRoot rather than hydrateRoot.
 */

const here = dirname(fileURLToPath(import.meta.url))
const web = resolve(here, '..')
const dist = join(web, 'dist')

const SITE = 'https://klyro.zeusdotdev.app'
const OG_IMAGE = `${SITE}/og.png`

/** Reads the string literals out of a meta.ts without importing TypeScript. */
function readMeta(slug) {
  const src = readFileSync(join(web, 'src/tools', slug, 'meta.ts'), 'utf8')
  const one = (key) => src.match(new RegExp(`\\b${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`))?.[1]
  const unescape = (v) => v?.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
  return {
    slug,
    title: unescape(one('title')),
    summary: unescape(one('summary')),
    seoTitle: unescape(src.match(/seo:\s*\{[\s\S]*?title:\s*'((?:[^'\\]|\\.)*)'/)?.[1]),
    description: unescape(src.match(/description:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)?.[1]),
    about: unescape(src.match(/about:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)?.[1]),
  }
}

const tools = readdirSync(join(web, 'src/tools'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => readMeta(e.name))
  .sort((a, b) => a.slug.localeCompare(b.slug))

const escape = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Swaps the head of the built index.html for this route's own. */
function render(template, { title, description, path, heading, body, jsonLd }) {
  // the trailing slash matters: this has to match the sitemap entry exactly,
  // or Search Console reports the canonical as pointing somewhere else
  const url = `${SITE}${path}`
  const head = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Klyro" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  let html = template
    // drop the template's own head tags; this route supplies its own
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/\s*<meta\s+property="og:[\s\S]*?\/>/g, '')
    .replace(/\s*<meta\s+name="twitter:[\s\S]*?\/>/g, '')
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?\/>/g, '')
    .replace('</head>', `  ${head}\n  </head>`)

  // Seeded so a crawler that never runs the bundle still reads something.
  // Off-screen rather than visible: the browser paints this the moment the HTML
  // arrives and React only replaces it once the bundle has parsed, which showed
  // up as a flash of the wrong page on every cold load. Positioned away rather
  // than display:none, which search engines discount.
  const seed =
    `<div style="position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden">` +
    `<h1>${escape(heading)}</h1><p>${escape(body)}</p>` +
    `</div>`
  html = html.replace('<div id="root"></div>', `<div id="root">${seed}</div>`)
  return html
}

const template = readFileSync(join(dist, 'index.html'), 'utf8')

/*
 * Routes are written as <path>.html, not <path>/index.html.
 * Amplify rejects a rewrite whose target puts a wildcard before a slash
 * ("/tools/<*>/index.html"), so the one rule that covers all 56 tools has to
 * end in an extension. See amplify-rules.json.
 */
const write = (path, html) => {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, `${path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

const SITE_DESCRIPTION =
  '56 image, PDF and video tools that run entirely in your browser. No upload, no account, and a live counter on the page proving nothing left the tab.'

write(
  '/',
  render(template, {
    title: 'Klyro — file tools that never upload your files',
    description: SITE_DESCRIPTION,
    path: '/',
    heading: 'Your files never leave this tab.',
    body: SITE_DESCRIPTION,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Klyro',
      description: SITE_DESCRIPTION,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      url: SITE,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  }),
)

write(
  '/console',
  render(template, {
    title: 'Console — describe a file job in one sentence | Klyro',
    description:
      'Say what you want done and Klyro plans the steps, then runs them on your own machine. Only the sentence and each file size are sent — never the file.',
    path: '/console',
    heading: 'What needs doing?',
    body: 'Describe the job in a sentence and a plan comes back for you to approve, then runs in your browser.',
  }),
)

write(
  '/privacy',
  render(template, {
    title: 'How Klyro keeps your files private | Klyro',
    description:
      'Exactly what leaves your machine and what never does. No upload endpoint, a Content-Security-Policy that enforces it, and a counter you can watch.',
    path: '/privacy',
    heading: 'What leaves your machine',
    body: 'Short answer: your files do not. Here is exactly how that works.',
  }),
)

for (const tool of tools) {
  const path = `/tools/${tool.slug}`
  write(
    path,
    render(template, {
      title: tool.seoTitle ?? `${tool.title} — Klyro`,
      description: tool.description ?? `${tool.summary} Runs entirely in your browser.`,
      path,
      heading: tool.seoTitle?.split(' — ')[0] ?? tool.title,
      body: tool.about ?? tool.summary,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Klyro', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE}/console` },
          { '@type': 'ListItem', position: 3, name: tool.title, item: `${SITE}${path}` },
        ],
      },
    }),
  )
}

const routes = ['/', '/console', '/privacy', ...tools.map((t) => `/tools/${t.slug}`)]
const today = new Date().toISOString().slice(0, 10)

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map(
      (r) =>
        `  <url>\n    <loc>${SITE}${r === '/' ? '/' : r}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${r === '/' ? '1.0' : r.startsWith('/tools/') ? '0.8' : '0.6'}</priority>\n  </url>`,
    )
    .join('\n')}\n</urlset>\n`,
)

writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
)

console.log(`seo: ${routes.length} routes, sitemap and robots.txt written to dist/`)
