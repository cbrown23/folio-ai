import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCollection, getCollectionItems, setCollectionItems } from '@/lib/collections'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const { id } = await params
  const collection = await getCollection(id, session.user.id)
  if (!collection) return Response.json({ error: 'not_found' }, { status: 404 })
  const items = await getCollectionItems(id)
  return Response.json({ items })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })
  const { id } = await params
  const collection = await getCollection(id, session.user.id)
  if (!collection) return Response.json({ error: 'not_found' }, { status: 404 })

  let body: { items: Array<{ document_source: string; section_label: string; position: number }> }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  await setCollectionItems(id, body.items)
  return Response.json({ ok: true })
}
