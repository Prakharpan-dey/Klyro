import { describe, expect, it } from 'vitest'

/**
 * The engine itself needs WebCodecs and cannot run here, but the shape of the
 * library it stands on can be checked in node. A version bump that renames an
 * export would otherwise surface as a blank tool page in front of a judge.
 */

describe('mediabunny contract', () => {
  it('still exports everything the engine reaches for', async () => {
    const mediabunny = await import('mediabunny')

    for (const name of [
      'Input',
      'Output',
      'Conversion',
      'ConversionCanceledError',
      'BufferTarget',
      'BlobSource',
      'Mp4OutputFormat',
      'WebMOutputFormat',
      'Quality',
      'canEncodeVideo',
      'canEncodeAudio',
    ] as const) {
      expect(mediabunny[name], `mediabunny no longer exports ${name}`).toBeDefined()
    }

    expect(Array.isArray(mediabunny.ALL_FORMATS)).toBe(true)
    expect(mediabunny.ALL_FORMATS.length).toBeGreaterThan(0)
  })

  it('reads a bare number as a quality level, not a bitrate', async () => {
    const { Quality } = await import('mediabunny')

    // the shape the engine uses: an explicit bits-per-second, named as such.
    // `new Quality(1_200_000)` is accepted too, but means something else
    // entirely, and a size target aimed that way silently overshoots.
    const asBitrate = new Quality({ bitrate: 1_200_000 })
    expect(asBitrate).toBeInstanceOf(Quality)
    expect(JSON.stringify(asBitrate)).not.toBe(JSON.stringify(new Quality(1_200_000)))
  })
})
