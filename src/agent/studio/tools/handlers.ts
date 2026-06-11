import { sql } from '@/lib/db'
import { ingestDocument } from '@/lib/ingest'
import { retrieveRelevant, formatChunksForPrompt } from '@/lib/rag'

type DocType = 'case-study' | 'journal' | 'bio' | 'resume' | 'memory'

export async function executeStudioTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  const ownerId = process.env.OWNER_ID ?? 'default'

  switch (name) {
    case 'save_content': {
      const type = input.type as DocType
      const title = input.title as string
      const slug = input.slug as string
      const content = input.content as string

      const relPath =
        type === 'case-study'
          ? `case-studies/${slug}.md`
          : type === 'journal'
            ? `journal/${slug}.md`
            : `${type}.md`

      const source = `content/${relPath}`
      const { chunks } = await ingestDocument(type, title, source, content, ownerId)
      return `Saved "${title}" to vector DB (${chunks} chunks, owner: ${ownerId}).`
    }

    case 'search_content': {
      const query = input.query as string
      const chunks = await retrieveRelevant(query, ownerId, 5)
      if (chunks.length === 0) {
        return `No existing content found for: "${query}"`
      }
      return formatChunksForPrompt(chunks)
    }

    case 'save_memory': {
      const title = input.title as string
      const content = input.content as string
      const people = input.people as Array<{ name: string; email?: string }>
      const contextDate = input.context_date as string | undefined

      const source = `memory/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
      const metadata: Record<string, unknown> = { people }
      if (contextDate) metadata.context_date = contextDate

      const { chunks } = await ingestDocument('memory', title, source, content, ownerId, ownerId, metadata)

      const withEmail = people.filter((p) => p.email)
      const withoutEmail = people.filter((p) => !p.email)

      const lines: string[] = [
        `Memory "${title}" saved (${chunks} chunk${chunks !== 1 ? 's' : ''}).`,
      ]

      if (withEmail.length > 0) {
        lines.push(`Will surface to: ${withEmail.map((p) => `${p.name} (${p.email})`).join(', ')}.`)
      }
      if (withoutEmail.length > 0) {
        lines.push(`⚠️ No email recorded for: ${withoutEmail.map((p) => p.name).join(', ')}. This memory will NOT surface to ${withoutEmail.length === 1 ? 'that person' : 'those people'} until you update it with their email.`)
      }
      if (withEmail.length === 0) {
        lines.push('⚠️ No emails recorded — this memory is owner-only and will not surface to any visitor.')
      }

      return lines.join(' ')
    }

    case 'save_connection': {
      const name = input.name as string
      const email = input.email as string
      const nickname = input.nickname as string | undefined
      const relationship = input.relationship as string | undefined
      const notes = input.notes as string | undefined

      const lines = [`## ${name}`, '', `**Email**: ${email}`]
      if (nickname) lines.push(`**Preferred name**: ${nickname}`)
      if (relationship) lines.push(`**Relationship**: ${relationship}`)
      if (notes) lines.push('', '### Notes', notes)
      const content = lines.join('\n')

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const source = `connection/${slug}`

      // Preserve visit history written by the login hook
      const existing = await sql`
        SELECT metadata FROM documents
        WHERE owner_id = ${ownerId}
          AND type = 'connection'
          AND metadata->>'email' = ${email}
        LIMIT 1
      `
      const preserved: Record<string, unknown> = {}
      if (existing.length > 0) {
        const m = existing[0].metadata as Record<string, unknown> | null ?? {}
        if (m.visit_count !== undefined) preserved.visit_count = m.visit_count
        if (m.last_seen !== undefined) preserved.last_seen = m.last_seen
      }

      const metadata = { ...preserved, email, name }
      const { chunks } = await ingestDocument('connection', name, source, content, ownerId, ownerId, metadata)

      return `Connection profile for ${name} saved (${chunks} chunk${chunks !== 1 ? 's' : ''}). The chat agent will use this when ${nickname ?? name} visits using ${email}.`
    }

    case 'get_connection': {
      const email = input.email as string

      const rows = await sql`
        SELECT content, metadata, created_at
        FROM documents
        WHERE owner_id = ${ownerId}
          AND type = 'connection'
          AND metadata->>'email' = ${email}
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (rows.length === 0) {
        return `No connection profile found for ${email}.`
      }

      const row = rows[0]
      const meta = (row.metadata as Record<string, unknown>) ?? {}
      const visitCount = meta.visit_count as number | undefined
      const lastSeen = meta.last_seen as string | undefined
      const createdAt = new Date(row.created_at as string).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })

      const lines: string[] = [row.content as string, '', '---', `**First seen**: ${createdAt}`]
      if (visitCount !== undefined) lines.push(`**Visit count**: ${visitCount}`)
      if (lastSeen) {
        const d = new Date(lastSeen).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        lines.push(`**Last seen**: ${d}`)
      }

      return lines.join('\n')
    }

    case 'set_baseline': {
      const source = input.source as string

      // Clear existing baseline flag from all resumes for this owner
      await sql`
        UPDATE documents
        SET metadata = metadata - 'is_baseline'
        WHERE owner_id = ${ownerId} AND type = 'resume'
      `

      const result = await sql`
        UPDATE documents
        SET metadata = metadata || '{"is_baseline": true}'::jsonb
        WHERE owner_id = ${ownerId} AND source = ${source}
        RETURNING title
      `

      if (result.length === 0) {
        return `No document found with source "${source}". Use list_content to see available sources.`
      }

      return `"${result[0].title}" is now the baseline resume.`
    }

    case 'list_content': {
      const typeFilter = input.type as string | undefined
      const since = input.since as string | undefined

      const rows = await sql`
        SELECT DISTINCT ON (source)
          type, title, source,
          MIN(created_at) OVER (PARTITION BY source) AS created_at
        FROM documents
        WHERE owner_id = ${ownerId}
          AND (${typeFilter ?? null} IS NULL OR type = ${typeFilter ?? null})
          AND (${since ?? null} IS NULL OR created_at >= ${since ?? null}::timestamptz)
        ORDER BY source, created_at DESC
      `

      if (rows.length === 0) {
        return typeFilter
          ? `No ${typeFilter} documents found${since ? ` since ${since}` : ''}.`
          : 'No documents in the portfolio yet.'
      }

      // Sort by created_at descending (newest first) after dedup
      const sorted = [...rows].sort(
        (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
      )

      const grouped: Record<string, string[]> = {}
      for (const row of sorted) {
        const t = row.type as string
        const date = new Date(row.created_at as string).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
        if (!grouped[t]) grouped[t] = []
        grouped[t].push(`- ${row.title} — ${date} (${row.source})`)
      }

      return Object.entries(grouped)
        .map(([type, items]) => `**${type}**\n${items.join('\n')}`)
        .join('\n\n')
    }

    default:
      return `Unknown tool: ${name}`
  }
}
