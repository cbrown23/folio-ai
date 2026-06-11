import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import config from '../../../../../folio.config'

export const dynamic = 'force-dynamic'

function isOwner(email?: string | null) {
  return !!email && email === (process.env.OWNER_EMAIL ?? config.owner.email)
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function GET() {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  await ensureTable()

  const ownerId = process.env.OWNER_ID ?? 'default'
  const rows = await sql`
    SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE owner_id = ${ownerId}
    ORDER BY updated_at DESC
  `

  return Response.json({ conversations: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  await ensureTable()

  let body: { id?: string; title: string; messages: unknown[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const ownerId = process.env.OWNER_ID ?? 'default'
  const { id, title, messages } = body
  const messagesJson = JSON.stringify(messages)

  if (id) {
    // Update existing conversation
    const rows = await sql`
      UPDATE conversations
      SET title = ${title}, messages = ${messagesJson}::jsonb, updated_at = NOW()
      WHERE id = ${id} AND owner_id = ${ownerId}
      RETURNING id
    `
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ id })
  } else {
    // Create new conversation
    const rows = await sql`
      INSERT INTO conversations (owner_id, title, messages)
      VALUES (${ownerId}, ${title}, ${messagesJson}::jsonb)
      RETURNING id
    `
    return Response.json({ id: rows[0].id })
  }
}
