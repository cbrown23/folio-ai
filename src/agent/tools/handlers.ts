import config from '../../../folio.config'

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
    case 'schedule_meeting': {
      const topic = input.topic as string | undefined
      const baseUrl = `https://cal.com/${config.scheduling.calUsername}/${config.scheduling.defaultEventSlug}`
      const url = topic
        ? `${baseUrl}?notes=${encodeURIComponent(topic)}`
        : baseUrl
      const visitorName = session?.user?.name ?? 'you'
      return `Here's a booking link for ${visitorName}: ${url}\n\nThat'll get you a 30-minute slot with Clint. He'll see your LinkedIn profile when you book.`
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
