import Anthropic from '@anthropic-ai/sdk'

export const studioTools: Anthropic.Tool[] = [
  {
    name: 'save_content',
    description:
      'Save a finalized piece of portfolio content to the vector database and optionally to the filesystem. Only call this when the owner explicitly approves the content for saving.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['case-study', 'journal', 'bio', 'resume'],
          description: 'Content type',
        },
        title: {
          type: 'string',
          description: 'Human-readable title',
        },
        slug: {
          type: 'string',
          description:
            'URL-safe filename without extension, e.g. "container-platform-redesign"',
        },
        content: {
          type: 'string',
          description: 'Full markdown content to save',
        },
      },
      required: ['type', 'title', 'slug', 'content'],
    },
  },
  {
    name: 'search_content',
    description:
      'Semantically search existing portfolio content. Use to check if a topic is already covered or to find related content before creating new material.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'What to search for',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_memory',
    description:
      'Save a career memory involving one or more people. A memory ONLY surfaces to a visitor if their LinkedIn email exactly matches an email recorded in the people array — email is mandatory for the memory to be retrievable by that person. Memories with no emails are owner-only and will never surface to visitors.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Short title for the memory, e.g. "Kubernetes migration at Acme Corp"',
        },
        content: {
          type: 'string',
          description: 'The full narrative of the memory — what happened, why it mattered, the shared experience',
        },
        people: {
          type: 'array',
          description: 'People involved in this memory. Email is required per person for the memory to surface when they visit — do not omit it without explicitly confirming the owner does not have it.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', description: 'LinkedIn email address — required for this person to see the memory when they visit' },
            },
            required: ['name'],
          },
        },
        context_date: {
          type: 'string',
          description: 'Approximate timeframe, e.g. "2021–2022" or "Q3 2023"',
        },
      },
      required: ['title', 'content', 'people'],
    },
  },
  {
    name: 'save_connection',
    description:
      "Save a persistent profile for a specific person who may visit the portfolio. The chat agent uses this to personalize conversations — nicknames, relationship context, and notes will be available whenever that person logs in with their email. Unlike memories (which are event-based), a connection is an ongoing profile that captures who this person is to the owner.",
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: "Person's full name",
        },
        email: {
          type: 'string',
          description: "Person's LinkedIn email — required; this is the only way the system identifies the visitor",
        },
        nickname: {
          type: 'string',
          description: "Preferred name or nickname the owner uses for this person",
        },
        relationship: {
          type: 'string',
          description: "How the owner knows this person — context, history, company, timeframe",
        },
        notes: {
          type: 'string',
          description: "Anything else the chat agent should know: personality, shared experiences, topics to reference or avoid, current role, etc.",
        },
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'set_baseline',
    description:
      'Designate an existing resume document as the baseline. Use this when the owner wants to promote a conversationally-generated resume to baseline status. Clears the baseline flag from any previous baseline resume.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          description: 'The source path of the document to designate, e.g. "content/resume.md"',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'list_content',
    description:
      'List documents in the portfolio vector database. Results include creation date and are ordered newest-first. Optionally filter by type or restrict to documents created on or after a given date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          description: 'Filter by document type: bio, resume, case-study, journal, memory, job-req',
        },
        since: {
          type: 'string',
          description: 'ISO 8601 date string (e.g. "2025-01-01"). Only return documents created on or after this date.',
        },
      },
      required: [],
    },
  },
]
