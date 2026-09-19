import { BedrockHttpError, chatCompletion } from './bedrock'
import { SUBMIT_PLAN_TOOL, SYSTEM_PROMPT, userMessage } from './prompt'
import { checkParams, checkRefs, planSchema, type Plan, type PlanRequest } from './schema'

export class PlannerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export interface PlanResult {
  plan: Plan
  usage?: { inputTokens: number; outputTokens: number }
}

export function validatePlan(input: unknown, fileCount: number): Plan {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) throw new PlannerError('The planner returned an invalid plan', 502)
  const error = checkRefs(parsed.data, fileCount) ?? checkParams(parsed.data)
  if (error) throw new PlannerError(`The planner returned an invalid plan: ${error}`, 502)
  return parsed.data
}

export async function planWithBedrock(req: PlanRequest): Promise<PlanResult> {
  const model = process.env.MODEL_ID || 'openai.gpt-oss-120b'

  let response
  try {
    response = await chatCompletion({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage(req) },
      ],
      tools: [SUBMIT_PLAN_TOOL],
      // open models spend tokens on reasoning before the tool call, so leave room
      max_completion_tokens: 4000,
      temperature: 0,
    })
  } catch (err) {
    if (err instanceof BedrockHttpError) {
      if (err.status === 403 || err.status === 404) {
        throw new PlannerError('The planner model is not available on this account', 503)
      }
      if (err.status === 429) throw new PlannerError('Planner is busy, try again', 429)
      throw new PlannerError('Planner is unavailable right now', 503)
    }
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new PlannerError('The planner took too long. Try a shorter instruction.', 504)
    }
    throw err
  }

  const choice = response.choices?.[0]
  const call = choice?.message?.tool_calls?.find(
    (c) => c.function.name === SUBMIT_PLAN_TOOL.function.name,
  )
  if (!call) {
    const reason = choice?.finish_reason === 'length' ? ' It ran out of room.' : ''
    throw new PlannerError(`The planner did not return a plan. Try rephrasing.${reason}`, 502)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(call.function.arguments)
  } catch {
    throw new PlannerError('The planner returned an invalid plan', 502)
  }

  return {
    plan: validatePlan(parsed, req.files.length),
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  }
}
