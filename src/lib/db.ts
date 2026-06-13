import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL

// Skip the early check during `next build` — routes are statically evaluated
// without runtime env vars. Any actual query with the placeholder URL will
// fail at runtime, which is the correct behavior.
if (!url && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL is not set')
}

export const sql = neon(url ?? 'postgresql://localhost/placeholder')
