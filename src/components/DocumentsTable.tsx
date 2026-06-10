'use client'

import { useState, useEffect, useCallback } from 'react'

type Doc = {
  type: string
  title: string
  source: string
  submitted_by: string | null
  chunk_count: number
  is_baseline: boolean
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  'bio':          'bg-sky-900/50 text-sky-300 border-sky-700/50',
  'resume':       'bg-violet-900/50 text-violet-300 border-violet-700/50',
  'case-study':   'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  'journal':      'bg-amber-900/50 text-amber-300 border-amber-700/50',
  'job-req':      'bg-rose-900/50 text-rose-300 border-rose-700/50',
}

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded border font-mono ${colors}`}>
      {type}
    </span>
  )
}

export default function DocumentsTable() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/studio/documents')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDocs(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleDelete(source: string) {
    if (confirmDelete !== source) {
      setConfirmDelete(source)
      return
    }
    setDeleting(source)
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/studio/documents?source=${encodeURIComponent(source)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDocs((prev) => prev.filter((d) => d.source !== source))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Loading documents…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchDocs} className="text-xs text-zinc-400 hover:text-white underline">
          Retry
        </button>
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        No documents in the portfolio yet. Use the Chat tab or upload a baseline resume to get started.
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-700 text-xs text-zinc-400 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium text-center">Chunks</th>
            <th className="px-4 py-3 font-medium text-center">Baseline</th>
            <th className="px-4 py-3 font-medium">Added</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {docs.map((doc) => {
            const isDeleting = deleting === doc.source
            const isConfirming = confirmDelete === doc.source
            const date = new Date(doc.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })

            return (
              <tr
                key={doc.source}
                className="hover:bg-zinc-800/40 transition-colors"
                onClick={() => { if (isConfirming) setConfirmDelete(null) }}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <TypeBadge type={doc.type} />
                </td>
                <td className="px-4 py-3 text-zinc-100 max-w-[200px] truncate" title={doc.title}>
                  {doc.title}
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs max-w-[220px] truncate" title={doc.source}>
                  {doc.source}
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">
                  {doc.chunk_count}
                </td>
                <td className="px-4 py-3 text-center">
                  {doc.is_baseline && (
                    <span title="Baseline resume">
                      <svg className="w-4 h-4 text-indigo-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {date}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.source) }}
                    disabled={isDeleting}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      isDeleting
                        ? 'text-zinc-600 cursor-not-allowed'
                        : isConfirming
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-800'
                    }`}
                  >
                    {isDeleting ? 'Deleting…' : isConfirming ? 'Confirm delete' : 'Delete'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-zinc-600">
        {docs.length} document{docs.length !== 1 ? 's' : ''} · {docs.reduce((n, d) => n + d.chunk_count, 0)} total chunks · Click outside a confirm button to cancel
      </p>
    </div>
  )
}
