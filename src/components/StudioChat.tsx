'use client'

import { useState, useRef, useEffect } from 'react'

type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  content: string
  toolStatus?: string
}

const GREETING = `Welcome to the content studio. What would you like to document today?

Options:
- **Case study** — walk me through a project and I'll structure it into a portfolio piece
- **Journal entry** — share a technical opinion or lesson learned
- **Bio/resume update** — update your professional summary

What's on your mind?`

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export default function StudioChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'assistant', content: GREETING },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const newMessages = [...messages.filter((m) => m.id !== 'greeting'), userMsg]
    setMessages((prev) => [...prev.filter((m) => m.id !== 'greeting'), userMsg])
    setInput('')
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', toolStatus: undefined },
    ])

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const parsed = JSON.parse(payload)

            if (parsed.delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.delta, toolStatus: undefined }
                    : m,
                ),
              )
            }

            if (parsed.tool) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, toolStatus: parsed.tool } : m,
                ),
              )
            }

            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${msg}`, toolStatus: undefined }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus('uploading')
    setUploadMessage('')

    try {
      const content = await file.text()
      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setUploadStatus('success')
      setUploadMessage(`"${file.name}" ingested as baseline resume (${data.chunks} chunks)`)
    } catch (err) {
      setUploadStatus('error')
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      // Reset input so the same file can be re-uploaded after edits
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap font-mono ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              }`}
            >
              {msg.toolStatus && (
                <div className="text-xs text-indigo-400 mb-2 italic">{msg.toolStatus}</div>
              )}
              {msg.content || (
                <span className="text-zinc-500 italic">
                  {msg.toolStatus ? '' : 'Thinking…'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Baseline resume upload */}
      <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500 shrink-0">Baseline resume:</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            onChange={handleFileUpload}
            disabled={uploadStatus === 'uploading'}
            className="hidden"
            id="resume-upload"
          />
          <label
            htmlFor="resume-upload"
            className={`cursor-pointer text-xs px-3 py-1.5 rounded border transition-colors ${
              uploadStatus === 'uploading'
                ? 'border-zinc-700 text-zinc-600 cursor-not-allowed'
                : 'border-zinc-600 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400'
            }`}
          >
            {uploadStatus === 'uploading' ? 'Uploading…' : 'Upload .md or .txt'}
          </label>
          {uploadMessage && (
            <span className={`text-xs truncate ${uploadStatus === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
              {uploadMessage}
            </span>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-4">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a project, share a thought, or ask to list existing content…"
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-center max-w-4xl mx-auto">
          Shift+Enter for new line · Enter to send · Content saves to the vector DB
        </p>
      </div>
    </div>
  )
}
