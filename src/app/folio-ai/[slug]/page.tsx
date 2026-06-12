import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getFolioBySlug } from '@/lib/folios'
import {
  getPublishedCompositionsForFolio,
  getFolioComposition,
  getCompositionItems,
  type Composition,
} from '@/lib/compositions'
import { sql } from '@/lib/db'
import ChatButton from '@/components/ChatButton'
import SignOutButton from '@/components/SignOutButton'
import RefreshFolioButton from '@/components/RefreshFolioButton'

export const revalidate = 300

type CompositionCard = Composition & {
  type_name: string
  excerpt: string
  viewer_href: string
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

function compositionViewerHref(folioSlug: string, comp: Composition): string {
  if (comp.type === 'architecture') return `/folio-ai/${folioSlug}/architecture/${comp.slug}`
  if (comp.type === 'case-study')   return `/folio-ai/${folioSlug}/case-studies/${comp.slug}`
  const typeFolder = comp.type.replace(/-/g, '-')
  return `/folio-ai/${folioSlug}/doc?source=content/${typeFolder}/${comp.slug}.md`
}

async function resolveCards(
  compositions: Array<Composition & { type_name: string }>,
  ownerId: string,
  folioSlug: string,
): Promise<CompositionCard[]> {
  return Promise.all(
    compositions.map(async (comp) => {
      const typeFolder = comp.type === 'case-study' ? 'case-studies' : comp.type
      const source = `content/${typeFolder}/${comp.slug}.md`
      let excerpt = ''
      try {
        const rows = await sql`
          SELECT content FROM documents
          WHERE owner_id = ${ownerId} AND source = ${source}
          ORDER BY created_at DESC LIMIT 1
        `
        if (rows[0]?.content) excerpt = extractExcerpt(rows[0].content as string)
      } catch { /* no content yet */ }
      return {
        ...comp,
        excerpt,
        viewer_href: compositionViewerHref(folioSlug, comp),
      }
    }),
  )
}

async function fetchBioExcerpt(ownerId: string): Promise<string> {
  try {
    const rows = await sql`
      SELECT content FROM documents
      WHERE owner_id = ${ownerId} AND type = 'bio'
      ORDER BY created_at DESC LIMIT 1
    `
    return rows[0]?.content ? extractExcerpt(rows[0].content as string, 320) : ''
  } catch { return '' }
}

async function buildSections(ownerId: string, folioSlug: string): Promise<
  Array<{ typeName: string; typeSlug: string; cards: CompositionCard[] }>
> {
  // Try folio composition first — it defines which compositions show and in what order
  let orderedCompositions: Array<Composition & { type_name: string }> = []
  const folioComp = await getFolioComposition(ownerId)

  // folioConfigured = true means the owner has set up the layout; honour it exclusively.
  // Only fall back to "all published folio-visible" when no folio composition exists at all
  // or it has zero composition-ref items (unconfigured). Never fall back just because all
  // referenced compositions happen to be unpublished — that would let unrelated newly-published
  // compositions sneak onto the page via the fallback.
  let folioConfigured = false

  if (folioComp) {
    const items = await getCompositionItems(folioComp.id)
    const compositionRefs = items.filter((it) => it.ref_composition_id)
    if (compositionRefs.length > 0) {
      folioConfigured = true

      // Avoid passing a JS array as a Neon parameter (ANY($1::uuid[]) is unreliable
      // with the HTTP driver). Fetch all non-folio compositions for this owner and
      // filter in JS — also uses LEFT JOIN so missing composition_type rows don't
      // silently drop valid compositions.
      const allRows = await sql`
        SELECT c.id, c.owner_id, c.type, c.title, c.slug, c.published, c.created_at, c.updated_at,
               COALESCE(ct.name, c.type)     AS type_name,
               COALESCE(ct.position, 99)     AS type_position
        FROM compositions c
        LEFT JOIN composition_types ct ON ct.slug = c.type AND ct.owner_id = c.owner_id
        WHERE c.owner_id = ${ownerId} AND c.type != 'folio' AND c.published = TRUE
      `
      const byId = new Map(
        (allRows as Array<Composition & { type_name: string }>).map((r) => [r.id, r])
      )
      // Preserve the folio composition's item order
      orderedCompositions = compositionRefs
        .map((it) => byId.get(it.ref_composition_id as string))
        .filter(Boolean) as Array<Composition & { type_name: string }>
    }
  }

  // Fallback only when the folio layout is unconfigured
  if (!folioConfigured) {
    orderedCompositions = await getPublishedCompositionsForFolio(ownerId)
  }

  if (orderedCompositions.length === 0) return []

  const cards = await resolveCards(orderedCompositions, ownerId, folioSlug)

  // Group by type, preserving first-seen order
  const typeOrder: string[] = []
  const typeNames: Record<string, string> = {}
  const grouped: Record<string, CompositionCard[]> = {}
  for (const card of cards) {
    if (!grouped[card.type]) {
      typeOrder.push(card.type)
      typeNames[card.type] = card.type_name
      grouped[card.type] = []
    }
    grouped[card.type].push(card)
  }

  return typeOrder.map((t) => ({
    typeName: typeNames[t],
    typeSlug: t,
    cards: grouped[t],
  }))
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

  const isOwner = session?.user?.id === folio.owner_id

  const [sections, bioExcerpt] = await Promise.all([
    buildSections(folio.owner_id, slug),
    fetchBioExcerpt(folio.owner_id),
  ])

  const hasContent = sections.length > 0
  const firstSection = sections[0]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-6 py-4 sticky top-0 bg-zinc-950/80 backdrop-blur z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/folio-ai" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← folio-ai
          </Link>
          <div className="flex items-center gap-3">
            {sections.map((section) => (
              <a
                key={section.typeSlug}
                href={`#${section.typeSlug}`}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block"
              >
                {section.typeName}
              </a>
            ))}
            <a href="#contact" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">Contact</a>
            {isOwner && (
              <>
                <RefreshFolioButton />
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
            {firstSection && (
              <a
                href={`#${firstSection.typeSlug}`}
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

      {/* Dynamic sections — one per composition type */}
      {sections.map((section) => (
        <section key={section.typeSlug} id={section.typeSlug} className="border-t border-zinc-800/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-sm font-mono text-indigo-400 mb-3 tracking-widest uppercase">
              {section.typeSlug.replace(/-/g, ' ')}
            </p>
            <h2 className="text-3xl font-bold text-white mb-12">{section.typeName}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {section.cards.map((card) => (
                <Link
                  key={card.id}
                  href={card.viewer_href}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-indigo-700 p-6 flex flex-col gap-3 transition-colors"
                >
                  <span className="text-xs font-mono text-indigo-400">{section.typeName}</span>
                  <h3 className="text-base font-semibold text-white leading-snug">{card.title}</h3>
                  {card.excerpt && (
                    <p className="text-sm text-zinc-400 leading-relaxed flex-1">{card.excerpt}</p>
                  )}
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Empty state */}
      {!hasContent && (
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
