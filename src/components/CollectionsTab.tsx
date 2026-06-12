'use client'

import { useState, useEffect, useCallback } from 'react'

type CollectionType = 'case-study' | 'architecture'

type Collection = {
  id: string
  type: CollectionType
  title: string
  slug: string
  published: boolean
  updated_at: string
}

type CollectionItem = {
  id: string
  document_source: string
  document_title: string
  section_label: string
  position: number
}

type DocOption = {
  source: string
  title: string
  type: string
}

const DEFAULT_LABELS: Record<CollectionType, string[]> = {
  'case-study': ['Architecture Diagram', 'Architecture Decision Record'],
  'architecture': ['Architecture Diagram', 'Design Write-up'],
}

const TYPE_COLOR: Record<CollectionType, string> = {
  'case-study': 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  'architecture': 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
}

export default function CollectionsTab({ folioSlug }: { folioSlug?: string }) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Collection | null>(null)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [docs, setDocs] = useState<DocOption[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [publishedSource, setPublishedSource] = useState('')

  // Create form
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<CollectionType>('architecture')
  const [createError, setCreateError] = useState('')

  // Item editing
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/studio/collections')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCollections(data.collections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/documents')
      if (!res.ok) return
      const data = await res.json()
      setDocs(
        (data.documents as Array<{ source: string; title: string; type: string }>).map((d) => ({
          source: d.source,
          title: d.title,
          type: d.type,
        })),
      )
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchCollections(); fetchDocs() }, [fetchCollections, fetchDocs])

  async function loadItems(col: Collection) {
    setSelected(col)
    setItems([])
    setDirty(false)
    setPublishError('')
    setPublishedSource('')
    setItemsLoading(true)
    try {
      const res = await fetch(`/api/studio/collections/${col.id}/items`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.items)
    } catch { /* show empty */ }
    finally { setItemsLoading(false) }
  }

  async function createCollection() {
    if (!newTitle.trim()) { setCreateError('Title required'); return }
    setCreateError('')
    try {
      const res = await fetch('/api/studio/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), type: newType }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`) }
      const data = await res.json()
      setCollections((prev) => [data.collection, ...prev])
      setNewTitle('')
      setCreating(false)
      loadItems(data.collection)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create')
    }
  }

  async function deleteCollection(id: string) {
    await fetch(`/api/studio/collections/${id}`, { method: 'DELETE' })
    setCollections((prev) => prev.filter((c) => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function addItem() {
    if (!selected) return
    const defaults = DEFAULT_LABELS[selected.type]
    const nextLabel = defaults[items.length] ?? ''
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), document_source: '', document_title: '', section_label: nextLabel, position: prev.length },
    ])
    setDirty(true)
  }

  function updateItem(idx: number, field: keyof CollectionItem, value: string) {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value } as CollectionItem
      if (field === 'document_source') {
        const doc = docs.find((d) => d.source === value)
        if (doc) next[idx].document_title = doc.title
      }
      return next
    })
    setDirty(true)
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, position: i })))
    setDirty(true)
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setItems(next.map((it, i) => ({ ...it, position: i })))
    setDirty(true)
  }

  async function saveItems() {
    if (!selected) return
    setSaving(true)
    try {
      const payload = items.map((it, i) => ({
        document_source: it.document_source,
        section_label: it.section_label,
        position: i,
      }))
      const res = await fetch(`/api/studio/collections/${selected.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    if (!selected) return
    if (dirty) await saveItems()
    setPublishing(true)
    setPublishError('')
    setPublishedSource('')
    try {
      const res = await fetch(`/api/studio/collections/${selected.id}/publish`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`) }
      const data = await res.json()
      setPublishedSource(data.source)
      setSelected((prev) => prev ? { ...prev, published: true } : prev)
      setCollections((prev) => prev.map((c) => c.id === selected.id ? { ...c, published: true } : c))
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">Loading collections…</div>
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — collection list */}
      <div className="w-64 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
          <span className="text-xs text-zinc-500">{collections.length} collection{collections.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setCreating((v) => !v)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              creating
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/40'
                : 'border-zinc-600 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400'
            }`}
          >
            {creating ? 'Cancel' : '+ New'}
          </button>
        </div>

        {creating && (
          <div className="border-b border-zinc-700 px-4 py-3 space-y-2 shrink-0">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createCollection() }}
              placeholder="Collection title"
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CollectionType)}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="architecture">Architecture</option>
              <option value="case-study">Case Study</option>
            </select>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <button
              onClick={createCollection}
              className="w-full text-xs py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Create
            </button>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 text-xs text-red-400">{error}</div>
        )}

        <ul className="flex-1 overflow-y-auto divide-y divide-zinc-800">
          {collections.length === 0 && !creating && (
            <li className="px-4 py-8 text-xs text-zinc-600 text-center">No collections yet</li>
          )}
          {collections.map((col) => (
            <li
              key={col.id}
              onClick={() => loadItems(col)}
              className={`group px-4 py-3 cursor-pointer transition-colors ${
                selected?.id === col.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-200 truncate">{col.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${TYPE_COLOR[col.type]}`}>
                      {col.type}
                    </span>
                    {col.published && (
                      <span className="text-[10px] text-emerald-400">● live</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCollection(col.id) }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all shrink-0"
                  title="Delete collection"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Main — collection detail */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          Select or create a collection
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-200">{selected.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${TYPE_COLOR[selected.type]}`}>
                {selected.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {publishError && <span className="text-xs text-red-400">{publishError}</span>}
              {publishedSource && folioSlug && (
                <a
                  href={`/folio-ai/${folioSlug}/${selected.type === 'case-study' ? 'case-studies' : 'architecture'}/${selected.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View live ↗
                </a>
              )}
              {dirty && (
                <button
                  onClick={saveItems}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                onClick={publish}
                disabled={publishing || items.length === 0}
                className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
              >
                {publishing ? 'Publishing…' : selected.published ? 'Republish' : 'Publish'}
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {itemsLoading ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 text-xs leading-none"
                        >▲</button>
                        <button
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === items.length - 1}
                          className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 text-xs leading-none"
                        >▼</button>
                      </div>

                      {/* Section label */}
                      <input
                        value={item.section_label}
                        onChange={(e) => updateItem(idx, 'section_label', e.target.value)}
                        placeholder="Section heading (e.g. Architecture Diagram)"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-zinc-600 hover:text-red-400 text-xs transition-colors shrink-0"
                        title="Remove"
                      >✕</button>
                    </div>

                    {/* Document picker */}
                    <select
                      value={item.document_source}
                      onChange={(e) => updateItem(idx, 'document_source', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">— select a document —</option>
                      {docs.map((doc) => (
                        <option key={doc.source} value={doc.source}>
                          [{doc.type}] {doc.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <button
                  onClick={addItem}
                  className="w-full text-xs py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-indigo-600 hover:text-indigo-400 transition-colors"
                >
                  + Add document
                </button>

                {items.length > 0 && (
                  <p className="text-xs text-zinc-600 pt-2">
                    Publishing compiles these documents into a single markdown page in the order shown.
                    You can include any document in multiple collections.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
