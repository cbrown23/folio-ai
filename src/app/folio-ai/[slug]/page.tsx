import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getFolioBySlug } from '@/lib/folios'
import { sql } from '@/lib/db'
import ChatButton from '@/components/ChatButton'
import SignOutButton from '@/components/SignOutButton'

export const revalidate = 300

type PublishedDoc = {
  title: string
  slug: string
  type: 'case-study' | 'architecture'
  excerpt: string
}

function extractExcerpt(content: string, maxLen = 220): string {
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('```')) {
      return t.length > maxLen ? t.slice(0, maxLen - 3) + '…' : t
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
      return { title: row.title as string, slug, type, excerpt: extractExcerpt(row.content as string) }
    })
  } catch {
    return []
  }
}

async function fetchBio(ownerId: string): Promise<string> {
  try {
    const rows = await sql`
      SELECT content FROM documents
      WHERE owner_id = ${ownerId} AND type = 'bio'
      ORDER BY created_at DESC LIMIT 1
    `
    return (rows[0]?.content as string) ?? ''
  } catch {
    return ''
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

export default async function FolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [folio, session] = await Promise.all([getFolioBySlug(slug), auth()])

  if (!folio) notFound()

  const [docs, bioContent] = await Promise.all([
    fetchPublishedDocs(folio.owner_id),
    fetchBio(folio.owner_id),
  ])

  const caseStudies = docs.filter((d) => d.type === 'case-study')
  const architectures = docs.filter((d) => d.type === 'architecture')
  const isOwner = session?.user?.id === folio.owner_id
  const bioExcerpt = extractExcerpt(bioContent, 320)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-6 py-4 sticky top-0 bg-zinc-950/80 backdrop-blur z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/folio-ai" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← folio-ai
          </Link>
          <div className="flex items-center gap-3">
            {caseStudies.length > 0 && (
              <a href="#work" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">Work</a>
            )}
            {architectures.length > 0 && (
              <a href="#architecture" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">Architecture</a>
            )}
            <a href="#contact" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">Contact</a>
            {isOwner && (
              <>
                <Link
                  href={`/folio-ai/${slug}/design`}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
                >
                  Studio
                </Link>
                <SignOutButton className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  Sign out
                </SignOutButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[500px] bg-indigo-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-sm font-mono text-indigo-400 mb-4 tracking-widest uppercase">
            Portfolio
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            {folio.name}
          </h1>
          {bioExcerpt ? (
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
              {bioExcerpt}
            </p>
          ) : (
            <p className="text-lg text-zinc-500 max-w-xl mb-10">
              Ask the assistant anything about my work and experience.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            {caseStudies.length > 0 && (
              <a
                href="#work"
                className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                View work
              </a>
            )}
            <a
              href="#contact"
              className="px-5 py-2.5 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
            >
              Get in touch
            </a>
          </div>
        </div>
      </section>

      {/* Case studies */}
      {caseStudies.length > 0 && (
        <section id="work" className="border-t border-zinc-800/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              Architecture work
            </p>
            <h2 className="text-3xl font-bold text-white mb-12">Case Studies</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {caseStudies.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/case-studies/${doc.slug}`}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-indigo-700 p-6 flex flex-col gap-3 transition-colors"
                >
                  <span className="text-xs font-mono text-indigo-400">Case Study</span>
                  <h3 className="text-base font-semibold text-white leading-snug">{doc.title}</h3>
                  {doc.excerpt && (
                    <p className="text-sm text-zinc-400 leading-relaxed flex-1">{doc.excerpt}</p>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read case study →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Architecture */}
      {architectures.length > 0 && (
        <section id="architecture" className="border-t border-zinc-800/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              System design
            </p>
            <h2 className="text-3xl font-bold text-white mb-12">Architecture Designs</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {architectures.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/architecture/${doc.slug}`}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-indigo-700 p-6 flex flex-col gap-3 transition-colors"
                >
                  <span className="text-xs font-mono text-indigo-400">Architecture</span>
                  <h3 className="text-base font-semibold text-white leading-snug">{doc.title}</h3>
                  {doc.excerpt && (
                    <p className="text-sm text-zinc-400 leading-relaxed flex-1">{doc.excerpt}</p>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read design →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {docs.length === 0 && (
        <section className="border-t border-zinc-800/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center">
              <p className="text-zinc-500">No published content yet — check back soon.</p>
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="border-t border-zinc-800/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
            Get in touch
          </p>
          <h2 className="text-3xl font-bold text-white mb-4">Let&apos;s talk</h2>
          <p className="text-zinc-400 max-w-lg mb-8">
            Use the chat assistant to ask about my experience, or reach out directly.
          </p>
          <p className="text-xs text-zinc-600">
            Powered by{' '}
            <Link href="/folio-ai" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              folio-ai
            </Link>
          </p>
        </div>
      </section>

      <ChatButton apiPath={`/api/folio-ai/${slug}/chat`} />
    </div>
  )
}
