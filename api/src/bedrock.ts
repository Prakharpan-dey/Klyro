import { Sha256 } from '@aws-crypto/sha256-js'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'

/**
 * Minimal client for the Bedrock Mantle endpoint, which serves an OpenAI-compatible
 * chat API at /v1/chat/completions. Requests are signed with SigV4 for the
 * `bedrock-mantle` service, so the Lambda's own role is the only credential involved.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  tools?: ChatTool[]
  max_completion_tokens?: number
  temperature?: number
}

export interface ChatResponse {
  choices?: {
    finish_reason?: string
    message?: {
      content?: string | null
      tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]
    }
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string; type?: string }
}

export class BedrockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'BedrockHttpError'
  }
}

const region = () => process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-south-1'

let signer: SignatureV4 | null = null
let signerRegion = ''

function getSigner() {
  const current = region()
  if (!signer || signerRegion !== current) {
    signer = new SignatureV4({
      credentials: defaultProvider(),
      region: current,
      service: 'bedrock-mantle',
      sha256: Sha256,
    })
    signerRegion = current
  }
  return signer
}

export async function chatCompletion(
  request: ChatRequest,
  timeoutMs = 20_000,
): Promise<ChatResponse> {
  const host = `bedrock-mantle.${region()}.api.aws`
  const path = '/v1/chat/completions'
  const body = JSON.stringify(request)

  const signed = await getSigner().sign(
    new HttpRequest({
      method: 'POST',
      protocol: 'https:',
      hostname: host,
      path,
      headers: { host, 'content-type': 'application/json' },
      body,
    }),
  )

  const res = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: signed.headers as Record<string, string>,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  })

  const text = await res.text()
  let data: ChatResponse
  try {
    data = JSON.parse(text)
  } catch {
    throw new BedrockHttpError(res.status, 'The model endpoint returned an unreadable response')
  }
  if (!res.ok) {
    throw new BedrockHttpError(
      res.status,
      data.error?.message ?? `Model endpoint error ${res.status}`,
    )
  }
  return data
}
