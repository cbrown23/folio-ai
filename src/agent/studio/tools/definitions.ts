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
      'List all documents currently in the portfolio vector database, grouped by type.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]
