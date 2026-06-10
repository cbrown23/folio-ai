import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Must match EMBEDDING_DIMS in src/lib/embeddings.ts
const DIMS = 512

async function setup() {
  console.log('Setting up database...')

  await sql`CREATE EXTENSION IF NOT EXISTS vector`
  console.log('✓ pgvector extension enabled')

  // Dimension is inlined — pgvector requires a literal, not a parameter
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS documents (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id    TEXT NOT NULL DEFAULT 'default',
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      source      TEXT,
      content     TEXT NOT NULL,
      embedding   vector(${DIMS}),
      metadata    JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  console.log('✓ documents table ready')

  // owner_id index supports future multi-tenant filtering
  await sql`
    CREATE INDEX IF NOT EXISTS documents_owner_id_idx
    ON documents (owner_id)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS documents_embedding_hnsw
    ON documents USING hnsw (embedding vector_cosine_ops)
  `
  console.log('✓ indexes ready')

  console.log('\nDatabase setup complete.')
}

setup().catch((err) => {
  console.error(err)
  process.exit(1)
})
