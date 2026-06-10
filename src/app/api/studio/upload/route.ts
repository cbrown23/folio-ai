import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { ingestDocument } from '@/lib/ingest'
import config from '../../../../../folio.config'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTENSIONS = ['.md', '.txt']
const MAX_SIZE_BYTES = 200_000 // 200KB — plenty for any resume

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'signin_required' }, { status: 401 })
  }
  const ownerEmail = process.env.OWNER_EMAIL ?? config.owner.email
  if (session.user.email !== ownerEmail) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { filename: string; content: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { filename, content } = body
  if (!filename || !content) {
    return Response.json({ error: 'filename and content are required' }, { status: 400 })
  }

  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 },
    )
  }

  if (content.length > MAX_SIZE_BYTES) {
    return Response.json({ error: 'File too large (max 200KB)' }, { status: 400 })
  }

  const ownerId = process.env.OWNER_ID ?? 'default'
  const source = `upload/resume/${filename}`
  const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  const { chunks } = await ingestDocument(
    'resume',
    title,
    source,
    content,
    ownerId,
    ownerId,
    { is_baseline: true },
  )

  console.log('[folio-ai baseline-upload]', JSON.stringify({
    timestamp: new Date().toISOString(),
    filename,
    chunks,
    source,
  }))

  return Response.json({ ok: true, chunks, source })
}
