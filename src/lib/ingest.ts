import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { sql } from './db'
import { embedBatch } from './embeddings'

export type DocType = 'bio' | 'resume' | 'case-study' | 'journal'

export function chunkText(text: string, maxChars = 600): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export async function ingestDocument(
  type: DocType,
  title: string,
  source: string,
  content: string,
  ownerId = process.env.OWNER_ID ?? 'default',
): Promise<{ chunks: number }> {
  const chunks = chunkText(content)
  await sql`DELETE FROM documents WHERE source = ${source} AND owner_id = ${ownerId}`

  const embeddings = await embedBatch(chunks)
  for (let i = 0; i < chunks.length; i++) {
    const vector = `[${embeddings[i].join(',')}]`
    await sql`
      INSERT INTO documents (owner_id, type, title, source, content, embedding)
      VALUES (${ownerId}, ${type}, ${title}, ${source}, ${chunks[i]}, ${vector}::vector)
    `
  }

  return { chunks: chunks.length }
}

export function saveContentFile(relPath: string, content: string): boolean {
  try {
    const fullPath = join(process.cwd(), 'content', relPath)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
    return true
  } catch {
    // Filesystem is read-only on Vercel — DB is the source of truth
    return false
  }
}
