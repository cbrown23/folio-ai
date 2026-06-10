import { sql } from './db'
import { embed } from './embeddings'

export type DocumentChunk = {
  id: string
  type: string
  title: string
  source: string
  content: string
  similarity: number
}

export async function retrieveRelevant(
  query: string,
  ownerId = process.env.OWNER_ID ?? 'default',
  limit = 8,
  threshold = 0.3,
  excludeTypes: string[] = ['job-req'],
): Promise<DocumentChunk[]> {
  const embedding = await embed(query)
  const vector = `[${embedding.join(',')}]`

  const rows = await sql`
    SELECT id, type, title, content,
           1 - (embedding <=> ${vector}::vector) AS similarity
    FROM documents
    WHERE owner_id = ${ownerId}
      AND type != ALL(${excludeTypes})
      AND 1 - (embedding <=> ${vector}::vector) > ${threshold}
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `

  return rows as DocumentChunk[]
}

export async function fetchMemoriesForVisitor(
  email: string | null,
  name: string | null,
  ownerId = process.env.OWNER_ID ?? 'default',
): Promise<DocumentChunk[]> {
  const results: DocumentChunk[] = []
  const seenSources = new Set<string>()

  // Match by email first — most precise
  if (email) {
    const emailJson = JSON.stringify([{ email }])
    const rows = await sql`
      SELECT id, type, title, source, content, 1.0 AS similarity
      FROM documents
      WHERE owner_id = ${ownerId}
        AND type = 'memory'
        AND (metadata->'people') @> ${emailJson}::jsonb
      ORDER BY source, created_at
    `
    for (const row of rows as DocumentChunk[]) {
      seenSources.add(row.source)
      results.push(row)
    }
  }

  // Fall back to name match for memories without email
  if (name) {
    const rows = await sql`
      SELECT id, type, title, source, content, 1.0 AS similarity
      FROM documents
      WHERE owner_id = ${ownerId}
        AND type = 'memory'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(metadata->'people') AS p
          WHERE LOWER(p->>'name') = LOWER(${name})
        )
      ORDER BY source, created_at
    `
    for (const row of rows as DocumentChunk[]) {
      if (!seenSources.has(row.source)) {
        seenSources.add(row.source)
        results.push(row)
      }
    }
  }

  return results
}

export async function fetchBaselineResume(
  ownerId = process.env.OWNER_ID ?? 'default',
): Promise<DocumentChunk[]> {
  const rows = await sql`
    SELECT id, type, title, content,
           1.0 AS similarity
    FROM documents
    WHERE owner_id = ${ownerId}
      AND type = 'resume'
      AND metadata->>'is_baseline' = 'true'
    ORDER BY created_at ASC
  `
  return rows as DocumentChunk[]
}

export function formatChunksForPrompt(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return ''
  return chunks
    .map((c) => `### ${c.title} (${c.type})\n${c.content}`)
    .join('\n\n')
}
