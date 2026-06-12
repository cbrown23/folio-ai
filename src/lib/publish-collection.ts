import Anthropic from '@anthropic-ai/sdk'
import { getCollection, getCollectionItems } from './collections'
import { ingestDocument } from './ingest'
import { sql } from './db'

const anthropic = new Anthropic()

async function compileWithAI(
  collectionType: string,
  title: string,
  items: Array<{ section_label: string; content: string }>,
): Promise<string> {
  const itemsBlock = items
    .map((it, i) =>
      `### Item ${i + 1} — Section: "${it.section_label}"\n\`\`\`\n${it.content.trim()}\n\`\`\``,
    )
    .join('\n\n')

  const systemPrompt = collectionType === 'case-study'
    ? `You are a technical writer composing a polished case study page in Markdown.
A case study should tell a clear story: the problem, constraints, options considered, the decision, the architecture (with any Mermaid diagrams rendered inline), and the outcome.
Use the provided documents as raw material — extract the most relevant content, weave them together coherently, and produce a single well-structured Markdown document.
Preserve all Mermaid diagram code blocks exactly as-is. Use ## for top-level sections. Keep the writing technical but readable.`
    : `You are a technical writer composing a polished architecture design page in Markdown.
An architecture design should explain the system clearly: the goals, the design decisions, the components, and how they interact (with any Mermaid diagrams rendered inline).
Use the provided documents as raw material — extract the most relevant content, weave them together coherently, and produce a single well-structured Markdown document.
Preserve all Mermaid diagram code blocks exactly as-is. Use ## for top-level sections. Keep the writing technical but precise.`

  const userPrompt = `Compile the following documents into a single polished ${collectionType} page titled "${title}".

${itemsBlock}

Produce only the final Markdown. Start with a brief intro after the title. Do not include a top-level # heading — that will be added by the template.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  return `# ${title}\n\n${text.trim()}`
}

export async function publishCollectionById(
  collectionId: string,
  ownerId: string,
): Promise<{ source: string }> {
  const collection = await getCollection(collectionId, ownerId)
  if (!collection) throw new Error('Collection not found')

  const items = await getCollectionItems(collectionId)
  if (items.length === 0) throw new Error('Collection is empty — add documents before publishing')

  const itemsWithContent = await Promise.all(
    items.map(async (item) => {
      const rows = await sql`
        SELECT content FROM documents
        WHERE owner_id = ${ownerId} AND source = ${item.document_source}
        ORDER BY created_at ASC
      `
      const content = (rows as Array<{ content: string }>).map((r) => r.content).join('\n\n')
      return { section_label: item.section_label, content }
    }),
  )

  const markdown = await compileWithAI(collection.type, collection.title, itemsWithContent)

  const docType = collection.type
  const source = `content/${docType === 'case-study' ? 'case-studies' : 'architecture'}/${collection.slug}.md`

  await ingestDocument(docType, collection.title, source, markdown, ownerId, ownerId, {
    published: true,
    collection_id: collectionId,
  })

  await sql`UPDATE collections SET published = TRUE, updated_at = NOW() WHERE id = ${collectionId}`

  return { source }
}
