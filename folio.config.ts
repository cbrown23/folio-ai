/**
 * folio.config.ts — owner-specific configuration for folio-ai
 *
 * Fork this repo and edit this file (plus /content) to personalize the site.
 * Do not modify core src/ files for personalization.
 */

const config = {
  owner: {
    name: 'Clint Brown',
    title: 'Principal Engineer & Container Platform Architect',
    email: 'clint.brown.atx@gmail.com',
    location: 'Austin, TX',
    linkedin: 'https://linkedin.com/in/clintbrown',
    github: 'https://github.com/creativecloudnative',
    domain: 'creativecloudnative.com',
  },

  site: {
    title: 'folio-ai',
    description:
      'AI-native portfolio — architecture case studies and an embedded AI assistant.',
    url: 'https://creativecloudnative.com',
  },

  agent: {
    // Display name shown to visitors in the chat UI
    assistantName: "Clint's Assistant",
    // Brief persona shown as chat placeholder / greeting
    greeting: "Hi — I can answer questions about Clint's work, or help you schedule time with him.",
  },

  scheduling: {
    // Cal.com username — used to build booking links
    calUsername: 'clint-brown',
    // Default event type slug from Cal.com
    defaultEventSlug: '30min',
  },

  content: {
    // Paths are relative to /content
    bioFile: 'bio.md',
    resumeFile: 'resume.md',
    caseStudiesDir: 'case-studies',
  },
} as const

export type FolioConfig = typeof config
export default config
