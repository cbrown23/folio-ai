import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCollection, updateCollection, deleteCollection } from '@/lib/collections'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const { id } = await params
  const collection = await getCollection(id, session.user.id)
  if (!collection) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json({ collection })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const { id } = await params

  let body: { title?: string; slug?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  const ok = await updateCollection(id, session.user.id, body)
  if (!ok) return Response.json({ error: 'not_found' }, { status: 404 })
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const { id } = await params
  await deleteCollection(id, session.user.id)
  return Response.json({ ok: true })
}
