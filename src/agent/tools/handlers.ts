import config from '../../../folio.config'
import { retrieveRelevant, formatChunksForPrompt } from '@/lib/rag'

type AuthSession = {
  user?: {
    name?: string | null
    email?: string | null
  }
} | null

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  session: AuthSession,
): Promise<string> {
  switch (name) {
    case 'analyze_job_fit': {
      const jobDescription = input.job_description as string
      const ownerId = process.env.OWNER_ID ?? 'default'
      // Cast a wider net with lower threshold and more chunks for a thorough fit analysis
      const chunks = await retrieveRelevant(jobDescription, ownerId, 10, 0.35, [])
      if (chunks.length === 0) {
        return "No relevant experience content found in the portfolio database. Proceed with what you know from the bio and resume in the system prompt."
      }
      return `## Relevant experience and skills retrieved from portfolio\n\n${formatChunksForPrompt(chunks)}`
    }

    case 'notify_owner': {
      const jobTitle = input.job_title as string | undefined
      const company = input.company as string | undefined
      const fitSummary = input.fit_summary as string
      console.log('[folio-ai job-fit]', JSON.stringify({
        timestamp: new Date().toISOString(),
        visitor: session?.user?.name ?? 'Unknown',
        visitorEmail: session?.user?.email ?? null,
        jobTitle: jobTitle ?? null,
        company: company ?? null,
        fitSummary,
      }))
      return 'Owner notified.'
    }

    case 'schedule_meeting': {
      const topic = input.topic as string | undefined
      const calUsername = process.env.CAL_USERNAME ?? config.scheduling.calUsername
      const baseUrl = `https://cal.com/${calUsername}/${config.scheduling.defaultEventSlug}`

      const params = new URLSearchParams()
      if (session?.user?.name) params.set('name', session.user.name)
      if (session?.user?.email) params.set('email', session.user.email)
      if (topic) params.set('notes', topic)
      const query = params.toString()
      const url = query ? `${baseUrl}?${query}` : baseUrl

      // Record LinkedIn identity server-side at the moment of intent —
      // this is the verified identity regardless of what they type into Cal.com
      console.log('[folio-ai booking-intent]', JSON.stringify({
        timestamp: new Date().toISOString(),
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
        topic: topic ?? null,
      }))

      const visitorName = session?.user?.name ?? 'you'
      return `Here's a booking link for ${visitorName}: ${url}\n\nYour name and email are pre-filled from your LinkedIn profile. Just pick a time and confirm.`
    }

    case 'take_note': {
      const note: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        visitor: session?.user?.name ?? 'Anonymous',
        visitorEmail: session?.user?.email ?? (input.email as string | undefined) ?? null,
        interest: input.interest,
      }
      if (input.name) note.name = input.name
      if (input.notes) note.notes = input.notes
      // Phase 4: log to server console. Phase 6: write to database.
      console.log('[folio-ai lead]', JSON.stringify(note, null, 2))
      return `Got it — I've noted your interest and Clint will be in touch. In the meantime, you can also reach him directly at ${config.owner.email} or grab a calendar slot if you'd like to chat sooner.`
    }

    default:
      return `Unknown tool: ${name}`
  }
}
