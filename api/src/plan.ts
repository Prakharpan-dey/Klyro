import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { planWithMock } from './mock'
import { PlannerError, planWithBedrock } from './planner'
import { LIMITS, planRequestSchema } from './schema'

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const started = Date.now()
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : (event.body ?? '')

  if (Buffer.byteLength(raw) > LIMITS.bodyBytes) return json(413, { error: 'Request too large' })

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return json(400, { error: 'Body must be JSON' })
  }

  const parsed = planRequestSchema.safeParse(body)
  if (!parsed.success) return json(400, { error: 'Invalid request' })
  const req = parsed.data

  try {
    const mock = process.env.MOCK_PLANNER === '1'
    const result = mock ? { plan: planWithMock(req) } : await planWithBedrock(req)

    // metrics only: the instruction and file names are never logged
    console.log(
      JSON.stringify({
        event: 'plan',
        mock,
        ms: Date.now() - started,
        files: req.files.length,
        steps: result.plan.steps.length,
        clarified: Boolean(result.plan.clarification),
        ...('usage' in result ? result.usage : {}),
      }),
    )
    return json(200, { plan: result.plan })
  } catch (err) {
    if (err instanceof PlannerError) {
      console.log(
        JSON.stringify({ event: 'plan_error', status: err.status, ms: Date.now() - started }),
      )
      return json(err.status, { error: err.message })
    }
    const name = err instanceof Error ? err.name : 'Unknown'
    console.error(JSON.stringify({ event: 'plan_failure', name, ms: Date.now() - started }))
    return json(503, { error: 'Planner is unavailable right now' })
  }
}
