import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import { SUBMIT_PLAN_TOOL, SYSTEM_PROMPT, userMessage } from './prompt'
import { checkRefs, planSchema, type Plan, type PlanRequest } from './schema'

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

let client: BedrockRuntimeClient | null = null

function getClient() {
  // region and credentials come from the Lambda environment
  client ??= new BedrockRuntimeClient({ maxAttempts: 2 })
  return client
}

export function validatePlan(input: unknown, fileCount: number): Plan {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) throw new PlannerError('The planner returned an invalid plan', 502)
  const refError = checkRefs(parsed.data, fileCount)
  if (refError) throw new PlannerError(`The planner returned an invalid plan: ${refError}`, 502)
  return parsed.data
}

function findToolUse(content: ContentBlock[] | undefined) {
  for (const block of content ?? []) {
    if (block.toolUse?.name === SUBMIT_PLAN_TOOL.name) return block.toolUse
  }
  return undefined
}

export async function planWithBedrock(req: PlanRequest): Promise<PlanResult> {
  const modelId = process.env.MODEL_ID || 'openai.gpt-oss-120b-1:0'

  let response
  try {
    response = await getClient().send(
      new ConverseCommand({
        modelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [{ role: 'user', content: [{ text: userMessage(req) }] }],
        inferenceConfig: { maxTokens: 2000, temperature: 0 },
        toolConfig: { tools: [{ toolSpec: SUBMIT_PLAN_TOOL }] },
      }),
    )
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'AccessDeniedException' || name === 'ValidationException') {
      throw new PlannerError('The planner model is not available on this account', 503)
    }
    if (name === 'ThrottlingException') throw new PlannerError('Planner is busy, try again', 429)
    throw err
  }

  if (
    response.stopReason === 'guardrail_intervened' ||
    response.stopReason === 'content_filtered'
  ) {
    throw new PlannerError('That request cannot be planned', 422)
  }

  const call = findToolUse(response.output?.message?.content)
  if (!call) {
    throw new PlannerError('The planner did not return a plan. Try rephrasing.', 502)
  }

  return {
    plan: validatePlan(call.input, req.files.length),
    usage: {
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
    },
  }
}
