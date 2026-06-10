import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/auth'
import { buildStudioSystemPrompt } from '@/agent/studio/prompts/system'
import { studioTools } from '@/agent/studio/tools/definitions'
import { executeStudioTool } from '@/agent/studio/tools/handlers'
import config from '../../../../../folio.config'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

function isOwner(email?: string | null): boolean {
  return !!email && email === config.owner.email
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'signin_required' }, { status: 401 })
  }
  if (!isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { messages: Anthropic.MessageParam[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const MAX_HISTORY = 20
  let messages: Anthropic.MessageParam[] = body.messages.slice(-MAX_HISTORY)
  const system = buildStudioSystemPrompt()
  const encoder = new TextEncoder()

  async function* generateStream() {
    for (let iter = 0; iter < 8; iter++) {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system,
        tools: studioTools,
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

        messages = [...messages, { role: 'assistant', content: finalMsg.content }]

        const results: Anthropic.ToolResultBlockParam[] = []
        for (const t of toolUses) {
          // Stream a status indicator so the UI shows tool activity
          const toolLabel =
            t.name === 'save_content'
              ? `Saving "${(t.input as Record<string, unknown>).title}"…`
              : t.name === 'search_content'
                ? `Searching for "${(t.input as Record<string, unknown>).query}"…`
                : t.name === 'list_content'
                  ? 'Listing portfolio content…'
                  : `Running ${t.name}…`
          yield `data: ${JSON.stringify({ tool: toolLabel })}\n\n`

          const result = await executeStudioTool(
            t.name,
            t.input as Record<string, unknown>,
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
