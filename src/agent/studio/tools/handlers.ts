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
