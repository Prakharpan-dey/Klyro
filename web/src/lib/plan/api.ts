import type { FileMeta } from '@/lib/fileMeta'
import { plannerUrl } from '@/features/telemetry/planner'
import { checkParams, checkRefs, planSchema, type Plan, type PlanRequest } from './schema'

export interface StagedForPlan {
  file: File
  meta?: FileMeta
}

/**
 * Only what the planner needs to choose operations: kind, type, size, and whichever of page
 * count, pixel size or duration applies. Never file contents.
 */
export function buildPlanRequest(
  instruction: string,
  staged: StagedForPlan[],
  shareNames: boolean,
): PlanRequest {
  return {
    instruction: instruction.trim(),
    files: staged.map(({ file, meta }, index) => ({
      index,
      kind: meta?.kind ?? 'other',
      mime: file.type || 'application/octet-stream',
      sizeKB: Math.round(file.size / 1024),
      ...(meta?.pages ? { pages: meta.pages } : {}),
      ...(meta?.width && meta.height ? { width: meta.width, height: meta.height } : {}),
      // a target size cannot be turned into a bitrate without knowing how long the clip runs
      ...(meta?.durationSec ? { durationSec: Math.round(meta.durationSec) } : {}),
      ...(meta?.kind === 'video' ? { hasAudio: meta.hasAudio ?? false } : {}),
      ...(shareNames ? { name: file.name.slice(0, 200) } : {}),
    })),
  }
}

export type PlannerMode = 'model' | 'rules'

export interface PlanResponse {
  plan: Plan
  bytesSent: number
  /** 'rules' means the API answered with its keyword fallback, not a model */
  mode: PlannerMode
}

export async function requestPlan(req: PlanRequest, signal?: AbortSignal): Promise<PlanResponse> {
  if (!plannerUrl) throw new Error('Planner is not connected')
  const body = JSON.stringify(req)

  let res: Response
  try {
    res = await fetch(`${plannerUrl}/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Could not reach the planner. The tools still work offline.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // the planner runs at a deliberately small concurrency, so a busy moment is
    // an ordinary outcome rather than a fault worth alarming anyone about
    if (res.status === 429) {
      throw new Error('The planner is busy. Try again in a moment — every tool works without it.')
    }
    if (res.status >= 500) {
      throw new Error(data.error ?? 'The planner could not answer. Every tool works without it.')
    }
    throw new Error(data.error ?? `Planner error (${res.status})`)
  }

  const parsed = planSchema.safeParse(data.plan)
  if (!parsed.success) throw new Error('The planner sent back something unexpected')
  const error = checkRefs(parsed.data, req.files.length) ?? checkParams(parsed.data)
  if (error) throw new Error(error)

  return {
    plan: parsed.data,
    bytesSent: new TextEncoder().encode(body).length,
    mode: data.mode === 'rules' ? 'rules' : 'model',
  }
}
