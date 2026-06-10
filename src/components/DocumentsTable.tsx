'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type Doc = {
  type: string
  title: string
  source: string
  submitted_by: string | null
  chunk_count: number
  is_baseline: boolean
  created_at: string
}

type DocType = 'bio' | 'resume' | 'case-study' | 'journal' | 'memory' | 'job-req' | 'connection'

const DOC_TYPES: DocType[] = ['bio', 'resume', 'case-study', 'journal', 'memory', 'job-req', 'connection']

const TYPE_COLORS: Record<string, string> = {
  'bio':          'bg-sky-900/50 text-sky-300 border-sky-700/50',
  'resume':       'bg-violet-900/50 text-violet-300 border-violet-700/50',
  'case-study':   'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  'journal':      'bg-amber-900/50 text-amber-300 border-amber-700/50',
  'job-req':      'bg-rose-900/50 text-rose-300 border-rose-700/50',
  'memory':       'bg-pink-900/50 text-pink-300 border-pink-700/50',
  'connection':   'bg-teal-900/50 text-teal-300 border-teal-700/50',
}

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded border font-mono ${colors}`}>
      {type}
    </span>
  )
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function DocumentsTable() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Upload form state
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<DocType>('resume')
  const [isBaseline, setIsBaseline] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleUpload() {
    if (!uploadFile) return
    setUploadState('uploading')
    setUploadMsg('')

    try {
      const name = uploadFile.name.toLowerCase()
      const isBinary = name.endsWith('.pdf') || name.endsWith('.docx')
      let content: string
      let fileType: 'text' | 'pdf' | 'docx'
      if (isBinary) {
        const buffer = await uploadFile.arrayBuffer()
        content = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        fileType = name.endsWith('.docx') ? 'docx' : 'pdf'
      } else {
        content = await uploadFile.text()
        fileType = 'text'
      }

      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          content,
          fileType,
          type: uploadType,
          isBaseline: uploadType === 'resume' ? isBaseline : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      setUploadState('success')
      setUploadMsg(`"${uploadFile.name}" uploaded (${data.chunks} chunks)`)
      setUploadFile(null)
      setIsBaseline(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchDocs()
    } catch (err) {
      setUploadState('error')
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed')
    }
  }

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

  const uploadForm = showUpload && (
    <div className="border-b border-zinc-700 bg-zinc-800/60 px-4 py-4">
      <div className="flex flex-wrap items-end gap-3 max-w-4xl">
        {/* File picker */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">File (.md, .txt, .pdf)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.pdf,.docx"
            onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setUploadState('idle'); setUploadMsg('') }}
            className="text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-zinc-600 file:text-xs file:bg-zinc-700 file:text-zinc-300 hover:file:border-indigo-500 hover:file:text-indigo-300 cursor-pointer"
          />
        </div>

        {/* Type selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Type</label>
          <select
            value={uploadType}
            onChange={(e) => { setUploadType(e.target.value as DocType); setIsBaseline(false) }}
            className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Baseline checkbox — only when type = resume */}
        {uploadType === 'resume' && (
          <label className="flex items-center gap-2 cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              checked={isBaseline}
              onChange={(e) => setIsBaseline(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-xs text-zinc-300">Set as baseline</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-2 self-end">
          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploadState === 'uploading'}
            className="text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {uploadState === 'uploading' ? 'Uploading…' : 'Upload'}
          </button>
          <button
            onClick={() => { setShowUpload(false); setUploadFile(null); setUploadState('idle'); setUploadMsg('') }}
            className="text-xs px-3 py-1.5 text-zinc-400 hover:text-white border border-zinc-600 hover:border-zinc-400 rounded transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Status message */}
        {uploadMsg && (
          <span className={`text-xs self-end pb-1.5 ${uploadState === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {uploadMsg}
          </span>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">
          Loading documents…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchDocs} className="text-xs text-zinc-400 hover:text-white underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
        <span className="text-xs text-zinc-500">
          {docs.length} document{docs.length !== 1 ? 's' : ''} · {docs.reduce((n, d) => n + d.chunk_count, 0)} chunks
        </span>
        <button
          onClick={() => { setShowUpload((v) => !v); setUploadState('idle'); setUploadMsg('') }}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            showUpload
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/40'
              : 'border-zinc-600 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400'
          }`}
        >
          {showUpload ? 'Cancel' : '+ Upload'}
        </button>
      </div>

      {/* Inline upload form */}
      {uploadForm}

      {/* Table or empty state */}
      {docs.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">
          No documents yet. Use the Chat tab or upload a file above.
        </div>
      ) : (
        <div className="overflow-auto flex-1">
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
            Click outside a confirm button to cancel deletion
          </p>
        </div>
      )}
    </div>
  )
}
