import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import config from '../../../../../folio.config'

export const dynamic = 'force-dynamic'

function isOwner(email?: string | null) {
  return !!email && email === (process.env.OWNER_EMAIL ?? config.owner.email)
}

export async function GET() {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const ownerId = process.env.OWNER_ID ?? 'default'

  const rows = await sql`
    SELECT
      type,
      title,
      source,
      submitted_by,
      COUNT(*)::int                                      AS chunk_count,
      bool_or((metadata->>'is_baseline')::boolean)       AS is_baseline,
      MIN(created_at)                                    AS created_at
    FROM documents
    WHERE owner_id = ${ownerId}
    GROUP BY type, title, source, submitted_by
    ORDER BY type, MIN(created_at) DESC
  `

  return Response.json({ documents: rows })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !isOwner(session.user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const source = req.nextUrl.searchParams.get('source')
  if (!source) {
    return Response.json({ error: 'source param required' }, { status: 400 })
  }

  const ownerId = process.env.OWNER_ID ?? 'default'
  const result = await sql`
    DELETE FROM documents
    WHERE owner_id = ${ownerId} AND source = ${source}
    RETURNING id
  `

  return Response.json({ deleted: result.length })
}
