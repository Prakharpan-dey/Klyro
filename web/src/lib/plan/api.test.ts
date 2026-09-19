import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPlanRequest, requestPlan } from './api'
import type { FileMeta } from '@/lib/fileMeta'

/**
 * The planner runs at a deliberately small concurrency, so a busy answer is an
 * ordinary event. What the reader sees when that happens is part of the design:
 * it should read as a pause, not a breakage, and it should say that the tools
 * do not need it.
 */

vi.mock('@/features/telemetry/planner', () => ({ plannerUrl: 'https://planner.test' }))

function reply(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

afterEach(() => vi.unstubAllGlobals())

const request = buildPlanRequest('make it smaller', [], false)

describe('requestPlan', () => {
  it('says the planner is busy, not broken, when it is throttled', async () => {
    vi.stubGlobal('fetch', reply(429))
    await expect(requestPlan(request)).rejects.toThrow(/busy/i)
    await expect(requestPlan(request)).rejects.toThrow(/every tool works without it/i)
  })

  it('does not put a status code in front of a reader when the server fails', async () => {
    vi.stubGlobal('fetch', reply(500))
    await expect(requestPlan(request)).rejects.toThrow(/could not answer/i)
  })

  it('prefers the message the server sent, when there is one', async () => {
    vi.stubGlobal('fetch', reply(503, { error: 'The model is unavailable in this region' }))
    await expect(requestPlan(request)).rejects.toThrow(/unavailable in this region/)
  })

  it('explains an unreachable planner without blaming the user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(requestPlan(request)).rejects.toThrow(/tools still work offline/i)
  })
})

describe('buildPlanRequest', () => {
  const meta = (kind: FileMeta['kind'], extra: Partial<FileMeta> = {}): FileMeta => ({
    kind,
    mime: 'x',
    size: 1,
    ...extra,
  })

  it('sends kind, size and shape, and never the contents', () => {
    const file = new File([new Uint8Array(4096)], 'marksheet.pdf', { type: 'application/pdf' })
    const built = buildPlanRequest(
      ' merge these ',
      [{ file, meta: meta('pdf', { pages: 3 }) }],
      false,
    )

    expect(built.instruction).toBe('merge these')
    expect(built.files[0]).toEqual({
      index: 0,
      kind: 'pdf',
      mime: 'application/pdf',
      sizeKB: 4,
      pages: 3,
    })
    expect(JSON.stringify(built)).not.toContain('marksheet')
  })

  it('shares the name only when told to', () => {
    const file = new File(['x'], 'aadhaar.jpg', { type: 'image/jpeg' })
    const staged = [{ file, meta: meta('image', { width: 100, height: 50 }) }]

    expect(buildPlanRequest('x', staged, false).files[0].name).toBeUndefined()
    expect(buildPlanRequest('x', staged, true).files[0].name).toBe('aadhaar.jpg')
  })

  it('describes a video by duration and sound, which the video ops need', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    const built = buildPlanRequest(
      'shrink it',
      [{ file, meta: meta('video', { durationSec: 42, hasAudio: true }) }],
      false,
    )

    expect(built.files[0]).toMatchObject({ kind: 'video', durationSec: 42, hasAudio: true })
    // still metadata only: nothing about the picture, and no name
    expect(JSON.stringify(built)).not.toContain('clip')
  })

  it('says a silent clip is silent rather than leaving it unknown', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    const built = buildPlanRequest('extract the audio', [{ file, meta: meta('video') }], false)
    expect(built.files[0].hasAudio).toBe(false)
  })
})
