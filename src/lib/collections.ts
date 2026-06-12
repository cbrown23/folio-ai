import { sql } from './db'

export type CollectionType = 'case-study' | 'architecture'

export type Collection = {
  id: string
  owner_id: string
  type: CollectionType
  title: string
  slug: string
  published: boolean
  created_at: string
  updated_at: string
}

export type CollectionItem = {
  id: string
  collection_id: string
  document_source: string
  document_title: string
  section_label: string
  position: number
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS collections (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id    TEXT         NOT NULL,
      type        TEXT         NOT NULL,
      title       TEXT         NOT NULL,
      slug        TEXT         NOT NULL,
      published   BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE(owner_id, slug)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS collection_items (
      id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      collection_id    UUID         NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      document_source  TEXT         NOT NULL,
      section_label    TEXT         NOT NULL DEFAULT '',
      position         INTEGER      NOT NULL DEFAULT 0
    )
  `
}

export async function getCollections(ownerId: string): Promise<Collection[]> {
  await ensureTables()
  const rows = await sql`
    SELECT id, owner_id, type, title, slug, published, created_at, updated_at
    FROM collections
    WHERE owner_id = ${ownerId}
    ORDER BY updated_at DESC
  `
  return rows as Collection[]
}

export async function getCollection(id: string, ownerId: string): Promise<Collection | null> {
  await ensureTables()
  const rows = await sql`
    SELECT id, owner_id, type, title, slug, published, created_at, updated_at
    FROM collections
    WHERE id = ${id} AND owner_id = ${ownerId}
    LIMIT 1
  `
  return (rows[0] as Collection) ?? null
}

export async function createCollection(
  ownerId: string,
  type: CollectionType,
  title: string,
  slug: string,
): Promise<Collection> {
  await ensureTables()
  const rows = await sql`
    INSERT INTO collections (owner_id, type, title, slug)
    VALUES (${ownerId}, ${type}, ${title}, ${slug})
    RETURNING id, owner_id, type, title, slug, published, created_at, updated_at
  `
  return rows[0] as Collection
}

export async function updateCollection(
  id: string,
  ownerId: string,
  fields: { title?: string; slug?: string },
): Promise<boolean> {
  const rows = await sql`
    UPDATE collections
    SET
      title      = COALESCE(${fields.title ?? null}, title),
      slug       = COALESCE(${fields.slug ?? null}, slug),
      updated_at = NOW()
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id
  `
  return rows.length > 0
}

export async function deleteCollection(id: string, ownerId: string): Promise<void> {
  await sql`DELETE FROM collections WHERE id = ${id} AND owner_id = ${ownerId}`
}

export async function getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
  const rows = await sql`
    SELECT ci.id, ci.collection_id, ci.document_source, ci.section_label, ci.position,
           COALESCE(d.title, ci.document_source) AS document_title
    FROM collection_items ci
    LEFT JOIN LATERAL (
      SELECT title FROM documents
      WHERE source = ci.document_source
      LIMIT 1
    ) d ON TRUE
    WHERE ci.collection_id = ${collectionId}
    ORDER BY ci.position ASC, ci.id ASC
  `
  return rows as CollectionItem[]
}

export async function setCollectionItems(
  collectionId: string,
  items: Array<{ document_source: string; section_label: string; position: number }>,
): Promise<void> {
  await sql`DELETE FROM collection_items WHERE collection_id = ${collectionId}`
  for (const item of items) {
    await sql`
      INSERT INTO collection_items (collection_id, document_source, section_label, position)
      VALUES (${collectionId}, ${item.document_source}, ${item.section_label}, ${item.position})
    `
  }
}

