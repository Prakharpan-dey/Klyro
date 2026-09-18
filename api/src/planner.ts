import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk'
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

let client: AnthropicBedrockMantle | null = null

function getClient() {
  // region and credentials come from the Lambda environment
  client ??= new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION, maxRetries: 1 })
  return client
}

export function validatePlan(input: unknown, fileCount: number): Plan {
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) throw new PlannerError('The planner returned an invalid plan', 502)
  const refError = checkRefs(parsed.data, fileCount)
  if (refError) throw new PlannerError(`The planner returned an invalid plan: ${refError}`, 502)
  return parsed.data
}

export async function planWithBedrock(req: PlanRequest): Promise<PlanResult> {
  const model = process.env.MODEL_ID || 'anthropic.claude-opus-5'

  const message = await getClient().messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'low' },
    tools: [SUBMIT_PLAN_TOOL],
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: userMessage(req) }],
  })

  if (message.stop_reason === 'refusal') {
    throw new PlannerError('That request cannot be planned', 422)
  }

  const call = message.content.find(
    (b) => b.type === 'tool_use' && b.name === SUBMIT_PLAN_TOOL.name,
  )
  if (!call || call.type !== 'tool_use') {
    throw new PlannerError('The planner did not return a plan. Try rephrasing.', 502)
  }

  return {
    plan: validatePlan(call.input, req.files.length),
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  }
}
