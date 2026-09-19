import { describe, expect, it } from 'vitest'
import { budgetForTarget, estimateBytes, fitHeight, presetBitrate, suggestScale } from './bitrate'
import {
  allowsAudio,
  allowsVideo,
  containerOf,
  resolveAudioCodec,
  resolveVideoCodec,
} from './compatibility'

describe('budgetForTarget', () => {
  const minute = { durationSec: 60, audioBps: 128_000 }

  it('spends the target over the duration, less the audio', () => {
    const budget = budgetForTarget({ targetBytes: 10 * 1024 * 1024, ...minute })
    // 10 MB over 60 s is about 1.4 Mbps all in; audio takes 128 kbps of it
    expect(budget.videoBps).toBeGreaterThan(1_200_000)
    expect(budget.videoBps).toBeLessThan(1_300_000)
    expect(budget.audioBps).toBe(128_000)
    expect(budget.achievable).toBe(true)
  })

  it('gives the audio share back to the video when it is muted', () => {
    const withSound = budgetForTarget({ targetBytes: 10 * 1024 * 1024, ...minute })
    const muted = budgetForTarget({ targetBytes: 10 * 1024 * 1024, durationSec: 60, audioBps: 0 })
    expect(muted.videoBps - withSound.videoBps).toBe(128_000)
  })

  it('says so when the target cannot be reached', () => {
    const budget = budgetForTarget({ targetBytes: 200 * 1024, durationSec: 600, audioBps: 0 })
    expect(budget.achievable).toBe(false)
    expect(budget.videoBps).toBe(120_000)
  })

  it('refuses a video whose length is unknown', () => {
    expect(() => budgetForTarget({ targetBytes: 1024, durationSec: 0, audioBps: 0 })).toThrow()
  })

  it('round trips with the size estimate', () => {
    const target = 25 * 1024 * 1024
    const budget = budgetForTarget({ targetBytes: target, durationSec: 120, audioBps: 96_000 })
    const bytes = estimateBytes(budget.videoBps, budget.audioBps, 120)
    expect(Math.abs(bytes - target) / target).toBeLessThan(0.01)
  })
})

describe('suggestScale', () => {
  const full = { width: 1920, height: 1080 }

  it('leaves a generous bitrate alone', () => {
    expect(suggestScale(full, 8_000_000)).toBeUndefined()
  })

  it('steps down when the bitrate is too thin for the frame', () => {
    const size = suggestScale(full, 900_000)
    expect(size).toBeDefined()
    expect(size!.height).toBeLessThan(1080)
  })

  it('never upscales a small source', () => {
    const size = suggestScale({ width: 640, height: 360 }, 200_000)
    expect(size?.height ?? 360).toBeLessThanOrEqual(360)
  })

  it('always returns even sides, because H.264 rejects odd ones', () => {
    for (const source of [
      { width: 1921, height: 1081 },
      { width: 1080, height: 1921 },
      { width: 999, height: 555 },
    ]) {
      const size = suggestScale(source, 150_000) ?? fitHeight(source, 360)
      expect(size.width % 2).toBe(0)
      expect(size.height % 2).toBe(0)
    }
  })

  it('keeps the aspect ratio when fitting a height', () => {
    const size = fitHeight(full, 720)
    expect(size).toEqual({ width: 1280, height: 720 })
  })
})

describe('presetBitrate', () => {
  it('asks for more bits as the frame grows', () => {
    expect(presetBitrate(1080, 'balanced')).toBeGreaterThan(presetBitrate(720, 'balanced'))
    expect(presetBitrate(720, 'high')).toBeGreaterThan(presetBitrate(720, 'small'))
  })
})

describe('container and codec pairing', () => {
  it('keeps AAC out of WebM and Opus out of MP4', () => {
    expect(allowsAudio('webm', 'aac')).toBe(false)
    expect(allowsAudio('mp4', 'opus')).toBe(false)
    expect(allowsAudio('mp4', 'aac')).toBe(true)
    expect(allowsAudio('webm', 'opus')).toBe(true)
  })

  it('keeps VP9 out of MP4', () => {
    expect(allowsVideo('mp4', 'vp9')).toBe(false)
    expect(allowsVideo('webm', 'vp9')).toBe(true)
    expect(allowsVideo('mp4', 'avc')).toBe(true)
  })

  it('falls back to a codec the container accepts', () => {
    expect(resolveVideoCodec('mp4', 'vp9')).toBe('avc')
    expect(resolveVideoCodec('webm', 'avc')).toBe('vp9')
    expect(resolveVideoCodec('webm', 'av1')).toBe('av1')
    expect(resolveAudioCodec('webm', 'aac')).toBe('opus')
    expect(resolveAudioCodec('mp4', undefined)).toBe('aac')
  })

  it('recognises the container a file is already in', () => {
    expect(containerOf(new File([], 'a.mp4', { type: 'video/mp4' }))).toBe('mp4')
    expect(containerOf(new File([], 'a.mov', { type: 'video/quicktime' }))).toBe('mp4')
    expect(containerOf(new File([], 'a.webm', { type: 'video/webm' }))).toBe('webm')
    // Windows hands .mkv over with no type at all
    expect(containerOf(new File([], 'a.mkv', { type: '' }))).toBe('webm')
    expect(containerOf(new File([], 'a.txt', { type: 'text/plain' }))).toBeUndefined()
  })
})
