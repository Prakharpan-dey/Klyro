/**
 * The arithmetic behind "make this fit in 10 MB".
 *
 * A video file is, near enough, bitrate times duration. That makes the target
 * easy to aim at and easy to get wrong: past a point, no bitrate will fit the
 * frames you are asking for, and the honest answer is a smaller picture rather
 * than a smeared one. Pure functions, so all of this is testable.
 */

export interface BitrateBudget {
  videoBps: number
  audioBps: number
  /** false when even the floor bitrate overshoots the target */
  achievable: boolean
}

/** Muxing overhead: container boxes, indexes and timestamps, about 3%. */
const OVERHEAD = 0.03
const MIN_VIDEO_BPS = 120_000

export interface BudgetParams {
  targetBytes: number
  durationSec: number
  /** 0 when the audio is being dropped */
  audioBps: number
  overhead?: number
  minVideoBps?: number
}

export function budgetForTarget({
  targetBytes,
  durationSec,
  audioBps,
  overhead = OVERHEAD,
  minVideoBps = MIN_VIDEO_BPS,
}: BudgetParams): BitrateBudget {
  if (!(durationSec > 0)) throw new Error('The length of this video could not be read')

  const usableBits = targetBytes * 8 * (1 - overhead)
  const videoBps = Math.floor(usableBits / durationSec - audioBps)

  if (videoBps < minVideoBps) {
    return { videoBps: minVideoBps, audioBps, achievable: false }
  }
  return { videoBps, audioBps, achievable: true }
}

/** What a chosen pair of bitrates will weigh, for the live readout. */
export function estimateBytes(
  videoBps: number,
  audioBps: number,
  durationSec: number,
  overhead = OVERHEAD,
): number {
  return Math.round((((videoBps + audioBps) * durationSec) / 8) * (1 + overhead))
}

export interface Size {
  width: number
  height: number
}

/** H.264 will not take odd dimensions, and this is where that gets enforced. */
function even(n: number): number {
  return Math.max(2, Math.round(n) & ~1)
}

export function fitHeight(source: Size, height: number): Size {
  const scale = height / source.height
  return { width: even(source.width * scale), height: even(height) }
}

const LADDER = [1080, 720, 480, 360]

/**
 * Picks a smaller frame when the bitrate is too thin to carry the full one.
 * Around 0.07 bits per pixel per frame is where H.264 starts to look like
 * wet paint. Never upscales; returns undefined when the source size is fine.
 */
export function suggestScale(source: Size, videoBps: number, fps = 30): Size | undefined {
  const bitsPerPixel = (height: number) => {
    const width = (source.width / source.height) * height
    return videoBps / (width * height * fps)
  }

  if (bitsPerPixel(source.height) >= 0.07) return undefined

  for (const height of LADDER) {
    if (height >= source.height) continue
    if (bitsPerPixel(height) >= 0.07) return fitHeight(source, height)
  }
  const smallest = LADDER[LADDER.length - 1]
  return source.height > smallest ? fitHeight(source, smallest) : undefined
}

export type QualityTier = 'small' | 'balanced' | 'high'

/** Bitrates that look right at a given height, for the preset mode. */
export function presetBitrate(height: number, tier: QualityTier): number {
  const base = Math.max(360, Math.min(2160, height))
  // roughly 1.4 Mbps at 720p on the balanced tier, scaling with pixel count
  const scale = (base / 720) ** 1.8
  const tiers: Record<QualityTier, number> = {
    small: 700_000,
    balanced: 1_400_000,
    high: 2_800_000,
  }
  return Math.round(tiers[tier] * scale)
}
