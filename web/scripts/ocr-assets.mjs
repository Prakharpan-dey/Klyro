import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Copies the OCR engine and its language models out of node_modules and into
 * public/ocr, so the browser loads them from this origin.
 *
 * Tesseract would otherwise pull them from a CDN at runtime, which the site's
 * connect-src forbids and which would weaken the promise that nothing about
 * your file leaves the machine. Runs before dev and before build.
 */

const require = createRequire(import.meta.url)

// Only the LSTM builds; the legacy engine is twice the size and we never ask
// for it. Each .wasm.js carries its own WebAssembly inside it, so the matching
// .wasm file is not needed. The browser downloads whichever one it can run.
export const ENGINES = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]

export const LANGUAGES = ['eng', 'hin']

/** Where each published file comes from, keyed by the path the browser asks for. */
export function assetSources() {
  const core = dirname(require.resolve('tesseract.js-core/package.json'))
  const tesseract = dirname(require.resolve('tesseract.js/package.json'))

  const sources = { 'worker.min.js': join(tesseract, 'dist', 'worker.min.js') }
  for (const engine of ENGINES) sources[engine] = join(core, engine)

  for (const language of LANGUAGES) {
    const pkg = dirname(require.resolve(`@tesseract.js-data/${language}/package.json`))
    // the "best_int" models are the ones the LSTM engine wants, and the smallest
    sources[`lang/${language}.traineddata.gz`] = join(
      pkg,
      '4.0.0_best_int',
      `${language}.traineddata.gz`,
    )
  }
  return sources
}

export function copyOcrAssets(outDir) {
  const sources = assetSources()
  mkdirSync(join(outDir, 'lang'), { recursive: true })
  for (const [name, source] of Object.entries(sources)) copyFileSync(source, join(outDir, name))
  return Object.keys(sources)
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ocr')
  const copied = copyOcrAssets(out)
  console.log(`ocr assets ready in ${out} (${copied.length} files)`)
}
