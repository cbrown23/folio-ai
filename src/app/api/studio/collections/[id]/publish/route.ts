import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { publishCollectionById } from '@/lib/publish-collection'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'signin_required' }, { status: 401 })

  const { id } = await params

  try {
    const { source } = await publishCollectionById(id, session.user.id)
    revalidatePath(`/folio-ai/${session.user.folioSlug ?? ''}`)
    return Response.json({ ok: true, source })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    const status = message === 'Collection not found' ? 404 : 422
    return Response.json({ error: message }, { status })
  }
}
