import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getFolioBySlug } from '@/lib/folios'
import { sql } from '@/lib/db'
import ChatButton from '@/components/ChatButton'
import Logo from '@/components/Logo'

export const revalidate = 300

type PublishedDoc = {
  title: string
  slug: string
  type: 'case-study' | 'architecture'
  excerpt: string
}

function extractExcerpt(content: string): string {
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('```')) {
      return t.length > 200 ? t.slice(0, 197) + '…' : t
    }
  }
  return ''
}

async function fetchPublishedDocs(ownerId: string): Promise<PublishedDoc[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT ON (source) title, source, type, content
      FROM documents
      WHERE owner_id = ${ownerId}
        AND type IN ('case-study', 'architecture')
        AND metadata->>'published' = 'true'
      ORDER BY source, created_at ASC
    `
    return rows.map((row) => {
      const source = row.source as string
      const type = row.type as 'case-study' | 'architecture'
      const slug = source
        .replace('content/case-studies/', '')
        .replace('content/architecture/', '')
        .replace('.md', '')
      return {
        title: row.title as string,
        slug,
        type,
        excerpt: extractExcerpt(row.content as string),
      }
    })
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const folio = await getFolioBySlug(slug)
  if (!folio) return {}
  return {
    title: `${folio.name} — folio-ai`,
    description: `${folio.name}'s AI-native portfolio`,
  }
}

export default async function FolioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [folio, session] = await Promise.all([getFolioBySlug(slug), auth()])

  if (!folio) notFound()

  const docs = await fetchPublishedDocs(folio.owner_id)
  const caseStudies = docs.filter((d) => d.type === 'case-study')
  const architectures = docs.filter((d) => d.type === 'architecture')
  const isOwner = session?.user?.id === folio.owner_id

  return (
    <>
      <header className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Logo className="text-xs" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {isOwner && (
            <Link
              href={`/folio-ai/${slug}/design`}
              className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors text-xs"
            >
              Design Studio
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Folio hero */}
        <div className="mb-16">
          <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
            folio-ai
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">
            {folio.name}
          </h1>
          <p className="text-lg text-slate-400 max-w-xl">
            AI-native portfolio — ask the assistant anything about my work.
          </p>
        </div>

        {/* Case studies */}
        {caseStudies.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-6">Case Studies</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {caseStudies.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/case-studies/${doc.slug}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-800 p-5 flex flex-col gap-3 transition-colors"
                >
                  <span className="text-xs font-mono text-indigo-400">Case Study</span>
                  <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                  {doc.excerpt && (
                    <p className="text-sm text-slate-400 leading-relaxed flex-1">{doc.excerpt}</p>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Architecture designs */}
        {architectures.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-6">Architecture Designs</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {architectures.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/architecture/${doc.slug}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-800 p-5 flex flex-col gap-3 transition-colors"
                >
                  <span className="text-xs font-mono text-indigo-400">Architecture</span>
                  <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                  {doc.excerpt && (
                    <p className="text-sm text-slate-400 leading-relaxed flex-1">{doc.excerpt}</p>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {docs.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center">
            <p className="text-slate-500">No published content yet — check back soon.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6 px-6 mt-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-xs text-slate-600">
          <span>Built with <Logo className="inline" /></span>
          <Link href="/" className="hover:text-slate-400 transition-colors">folio-ai.com</Link>
        </div>
      </footer>

      <ChatButton apiPath={`/api/folio-ai/${slug}/chat`} />
    </>
  )
}
