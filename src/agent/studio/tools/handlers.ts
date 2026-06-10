import { sql } from '@/lib/db'
import { ingestDocument } from '@/lib/ingest'
import { retrieveRelevant, formatChunksForPrompt } from '@/lib/rag'

type DocType = 'case-study' | 'journal' | 'bio' | 'resume'

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
      const rows = await sql`
        SELECT DISTINCT ON (source) type, title, source
        FROM documents
        WHERE owner_id = ${ownerId}
        ORDER BY source, type
      `
      if (rows.length === 0) return 'No documents in the portfolio yet.'

      const grouped: Record<string, string[]> = {}
      for (const row of rows) {
        const t = row.type as string
        if (!grouped[t]) grouped[t] = []
        grouped[t].push(`- ${row.title} (${row.source})`)
      }

      return Object.entries(grouped)
        .map(([type, items]) => `**${type}**\n${items.join('\n')}`)
        .join('\n\n')
    }

    default:
      return `Unknown tool: ${name}`
  }
}
