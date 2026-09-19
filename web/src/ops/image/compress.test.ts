import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransformParams, TransformResult } from './pipeline'

/**
 * The encoder needs a canvas, so it is stood in for here. What is being tested
 * is the promise the tool makes: a thing called Compress never returns
 * something bigger than what it was handed.
 */

const transform = vi.fn<(file: Blob, params: TransformParams) => Promise<TransformResult>>()
vi.mock('./pool', () => ({ runTransform: (file: Blob, params: TransformParams) => transform(file, params) }))

const { compressImages } = await import('./compress')

function result(bytes: number, extra: Partial<TransformResult> = {}): TransformResult {
  return {
    blob: new Blob([new Uint8Array(bytes)]),
    width: 800,
    height: 600,
    fits: true,
    ...extra,
  }
}

function photo(bytes: number, type = 'image/jpeg') {
  return new File([new Uint8Array(bytes)], 'photo.jpg', { type })
}

beforeEach(() => transform.mockReset())

describe('compressImages', () => {
  it('returns the smaller file when there is one', async () => {
    transform.mockResolvedValue(result(40_000, { quality: 0.62 }))
    const [out] = await compressImages([photo(90_000)], { format: 'image/jpeg', quality: 0.8 })

    expect(out.file.size).toBe(40_000)
    expect(out.file.name).toBe('photo-compressed.jpg')
    expect(out.note).toBe('Q 0.62')
    expect(out.warning).toBeUndefined()
  })

  it('keeps the original rather than growing it in the same format', async () => {
    transform.mockResolvedValue(result(96_000))
    const source = photo(88_000)
    const [out] = await compressImages([source], { format: 'image/jpeg', quality: 0.9 })

    expect(out.file).toBe(source)
    expect(out.file.size).toBe(88_000)
    expect(out.warning).toMatch(/Kept your original/)
  })

  it('still converts when the format was asked for, but says it grew', async () => {
    transform.mockResolvedValue(result(150_000))
    const [out] = await compressImages([photo(88_000)], {
      format: 'image/png',
      quality: 0.9,
      targetKB: 60,
    })

    expect(out.file.name).toBe('photo-compressed.png')
    expect(out.warning).toMatch(/larger than the original/)
    expect(out.warning).toMatch(/JPG or WebP/)
  })

  it('reports a target it could not reach', async () => {
    transform.mockResolvedValue(result(70_000, { fits: false }))
    const [out] = await compressImages([photo(200_000)], {
      format: 'image/jpeg',
      quality: 0.9,
      targetKB: 60,
    })

    expect(out.warning).toMatch(/Could not reach 60 KB/)
  })

  it('passes the target through as bytes', async () => {
    transform.mockResolvedValue(result(10_000))
    await compressImages([photo(90_000)], { format: 'image/webp', quality: 0.8, targetKB: 50 })

    expect(transform).toHaveBeenCalledWith(expect.anything(), {
      format: 'image/webp',
      quality: 0.8,
      maxBytes: 51_200,
    })
  })
})

describe('when there is nothing to do', () => {
  it('leaves a file that already meets the target alone, without calling it a problem', async () => {
    const source = photo(40_000)
    const [out] = await compressImages([source], {
      format: 'image/jpeg',
      quality: 0.8,
      targetKB: 60,
    })

    expect(transform).not.toHaveBeenCalled()
    expect(out.file).toBe(source)
    expect(out.note).toBe('already under 60 KB')
    expect(out.warning).toBeUndefined()
  })

  it('still works when the format is being changed', async () => {
    transform.mockResolvedValue(result(20_000))
    const [out] = await compressImages([photo(40_000)], {
      format: 'image/webp',
      quality: 0.8,
      targetKB: 60,
    })

    expect(transform).toHaveBeenCalled()
    expect(out.file.name).toBe('photo-compressed.webp')
  })
})
