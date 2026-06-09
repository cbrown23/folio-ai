import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/auth'
import { buildSystemPrompt } from '@/agent/prompts/system'
import { tools } from '@/agent/tools/definitions'
import { executeTool } from '@/agent/tools/handlers'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

// Per-IP rate limiting — resets on cold start, good enough for a portfolio
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'rate_limit_exceeded' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'signin_required' }, { status: 401 })
  }

  let body: { messages: Anthropic.MessageParam[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const system = buildSystemPrompt(session.user?.name)
  // Cap history to keep input tokens bounded; preserves the most recent context
  const MAX_HISTORY = 10
  let messages: Anthropic.MessageParam[] = body.messages.slice(-MAX_HISTORY)

  const encoder = new TextEncoder()

  async function* generateStream() {
    for (let iter = 0; iter < 5; iter++) {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system,
        tools,
        messages,
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield `data: ${JSON.stringify({ delta: event.delta.text })}\n\n`
        }
      }

      const finalMsg = await stream.finalMessage()

      if (finalMsg.stop_reason === 'end_turn') break

      if (finalMsg.stop_reason === 'tool_use') {
        const toolUses = finalMsg.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        )

        messages = [
          ...messages,
          { role: 'assistant', content: finalMsg.content },
        ]

        const results: Anthropic.ToolResultBlockParam[] = []
        for (const t of toolUses) {
          const result = await executeTool(
            t.name,
            t.input as Record<string, unknown>,
            session,
          )
          results.push({ type: 'tool_result', tool_use_id: t.id, content: result })
        }

        messages = [...messages, { role: 'user', content: results }]
        continue
      }

      break
    }

    yield 'data: [DONE]\n\n'
  }

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generateStream()) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
