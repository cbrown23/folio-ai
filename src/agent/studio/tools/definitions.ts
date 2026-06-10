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
    name: 'list_content',
    description:
      'List all documents currently in the portfolio vector database, grouped by type.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'commit_to_repo',
    description:
      'Commit a content file to the GitHub repository. Call this after save_content succeeds to persist the file to version control. Creates the file if it does not exist; updates it if it does.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'Repo-relative path for the file, e.g. "content/case-studies/container-platform.md"',
        },
        content: {
          type: 'string',
          description: 'Full file content to commit',
        },
        message: {
          type: 'string',
          description:
            'Commit message, e.g. "content: add container platform case study"',
        },
      },
      required: ['path', 'content', 'message'],
    },
  },
]
