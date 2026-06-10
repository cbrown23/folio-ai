import { sql } from '@/lib/db'
import { ingestDocument, saveContentFile } from '@/lib/ingest'
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
      const savedToFs = saveContentFile(relPath, content)

      const fsNote = savedToFs
        ? `Also saved to \`content/${relPath}\`.`
        : 'Note: filesystem write skipped (production environment) — DB is the source of truth.'

      return `Saved "${title}" to vector DB (${chunks} chunks). ${fsNote}`
    }

    case 'search_content': {
      const query = input.query as string
      const chunks = await retrieveRelevant(query, ownerId, 5)
      if (chunks.length === 0) {
        return `No existing content found for: "${query}"`
      }
      return formatChunksForPrompt(chunks)
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

    case 'commit_to_repo': {
      const path = input.path as string
      const content = input.content as string
      const message = input.message as string

      const token = process.env.GITHUB_TOKEN
      const repoSlug = process.env.GITHUB_REPO
      if (!token || !repoSlug) {
        return 'GITHUB_TOKEN or GITHUB_REPO env var is not set — skipping git commit.'
      }

      const [owner, repo] = repoSlug.split('/')
      const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      }

      // Fetch existing SHA if the file already exists (required for updates)
      let sha: string | undefined
      const checkRes = await fetch(apiBase, { headers })
      if (checkRes.ok) {
        const existing = await checkRes.json() as { sha: string }
        sha = existing.sha
      }

      const body: Record<string, unknown> = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch: 'main',
      }
      if (sha) body.sha = sha

      const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })

      if (!putRes.ok) {
        const err = await putRes.json() as { message?: string }
        return `GitHub commit failed: ${err.message ?? putRes.statusText}`
      }

      const result = await putRes.json() as { commit: { html_url: string } }
      const action = sha ? 'Updated' : 'Created'
      return `${action} \`${path}\` — commit: ${result.commit.html_url}`
    }

    default:
      return `Unknown tool: ${name}`
  }
}
