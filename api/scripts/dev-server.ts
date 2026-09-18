// Runs the Lambda handler behind a plain HTTP server so the web app can use it during
// development without Docker. `sam local start-api` works too if you have SAM CLI.
import { createServer } from 'node:http'
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { handler } from '../src/plan'

const port = Number(process.env.PORT ?? 3001)

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/plan') {
    res.writeHead(404).end()
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)

  const event = {
    rawPath: '/plan',
    headers: req.headers,
    body: Buffer.concat(chunks).toString('utf8'),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2

  const result = (await handler(event)) as APIGatewayProxyStructuredResultV2
  res.writeHead(result.statusCode ?? 200, result.headers as Record<string, string>)
  res.end(result.body)
}).listen(port, () => {
  const mode =
    process.env.MOCK_PLANNER === '1'
      ? 'mock planner'
      : `Bedrock (${process.env.MODEL_ID || 'anthropic.claude-opus-5'})`
  console.log(`planner listening on http://localhost:${port}/plan using ${mode}`)
})
