import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || !session.user.folioSlug) {
    return Response.json({ error: 'signin_required' }, { status: 401 })
  }
  revalidatePath(`/folio-ai/${session.user.folioSlug}`)
  return Response.json({ ok: true })
}
