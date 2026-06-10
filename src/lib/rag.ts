import { sql } from './db'
import { embed } from './embeddings'

export type DocumentChunk = {
  id: string
  type: string
  title: string
  content: string
  similarity: number
}

export async function retrieveRelevant(
  query: string,
  ownerId = process.env.OWNER_ID ?? 'default',
  limit = 5,
  threshold = 0.5,
): Promise<DocumentChunk[]> {
  const embedding = await embed(query)
  const vector = `[${embedding.join(',')}]`

  const rows = await sql`
    SELECT id, type, title, content,
           1 - (embedding <=> ${vector}::vector) AS similarity
    FROM documents
    WHERE owner_id = ${ownerId}
      AND 1 - (embedding <=> ${vector}::vector) > ${threshold}
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `

  return rows as DocumentChunk[]
}

export function formatChunksForPrompt(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return ''
  return chunks
    .map((c) => `### ${c.title} (${c.type})\n${c.content}`)
    .join('\n\n')
}
