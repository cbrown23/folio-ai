import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import config from '../../../../../../folio.config'

export const dynamic = 'force-dynamic'

function isOwner(email?: string | null) {
  return !!email && email === (process.env.OWNER_EMAIL ?? config.owner.email)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const ownerId = process.env.OWNER_ID ?? 'default'

  const rows = await sql`
    SELECT id, title, messages, created_at, updated_at
    FROM conversations
    WHERE id = ${id} AND owner_id = ${ownerId}
    LIMIT 1
  `

  if (rows.length === 0) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  return Response.json({ conversation: rows[0] })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const ownerId = process.env.OWNER_ID ?? 'default'

  await sql`
    DELETE FROM conversations
    WHERE id = ${id} AND owner_id = ${ownerId}
  `

  return Response.json({ ok: true })
}
