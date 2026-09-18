import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain build script, not part of the app's type graph
import { assetSources, copyOcrAssets, ENGINES, LANGUAGES } from '../../../scripts/ocr-assets.mjs'

/**
 * The OCR engine is served from our own origin, which only works while the
 * files this script copies still exist under the names it expects. A version
 * bump that renames them would otherwise show up as a CDN request the content
 * security policy blocks, in the browser, on the day of the demo.
 */

describe('ocr assets', () => {
  it('finds every engine and language file inside node_modules', () => {
    const sources = assetSources() as Record<string, string>

    for (const [name, source] of Object.entries(sources)) {
      expect(statSync(source).size, `${name} is empty or missing`).toBeGreaterThan(1000)
    }
    for (const engine of ENGINES as string[]) expect(sources[engine]).toBeTruthy()
    for (const language of LANGUAGES as string[]) {
      expect(sources[`lang/${language}.traineddata.gz`]).toBeTruthy()
    }
  })

  it('copies them into the folder the browser asks for', () => {
    const dir = mkdtempSync(join(tmpdir(), 'klyro-ocr-'))
    try {
      const copied = copyOcrAssets(dir) as string[]
      expect(copied).toContain('worker.min.js')
      expect(readdirSync(dir)).toContain('worker.min.js')
      expect(readdirSync(join(dir, 'lang'))).toEqual(
        (LANGUAGES as string[]).map((language) => `${language}.traineddata.gz`),
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
