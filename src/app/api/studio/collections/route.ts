import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCollections, createCollection } from '@/lib/collections'
import type { CollectionType } from '@/lib/collections'
import { nameToSlug } from '@/lib/folios'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const collections = await getCollections(session.user.id)
  return Response.json({ collections })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })

  let body: { title: string; type: CollectionType }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  if (!body.title?.trim()) return Response.json({ error: 'title required' }, { status: 400 })
  if (!['case-study', 'architecture'].includes(body.type)) return Response.json({ error: 'invalid type' }, { status: 400 })

  const ownerId = session.user.id
  const base = nameToSlug(body.title.trim())

  // Ensure slug uniqueness per owner
  let slug = base
  let suffix = 1
  while (true) {
    const existing = await sql`SELECT id FROM collections WHERE owner_id = ${ownerId} AND slug = ${slug} LIMIT 1`
    if (existing.length === 0) break
    slug = `${base}-${suffix++}`
  }

  const collection = await createCollection(ownerId, body.type, body.title.trim(), slug)
  return Response.json({ collection }, { status: 201 })
}
