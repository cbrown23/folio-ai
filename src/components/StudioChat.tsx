'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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
- **Connection** — record a profile for someone who may visit the site (nickname, relationship, notes)
- **Memory** — capture a career moment involving a specific person so they'll see it referenced when they visit

What's on your mind?`

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

type Props = {
  restoredConversation?: { id: string; title: string; messages: Array<{ role: Role; content: string }> } | null
  onNewConversation?: () => void
}

export default function StudioChat({ restoredConversation, onNewConversation }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'assistant', content: GREETING },
  ])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Restore a saved conversation when the prop changes
  useEffect(() => {
    if (!restoredConversation) return
    const restored: Message[] = restoredConversation.messages.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role,
      content: m.content,
    }))
    setMessages(restored.length > 0 ? restored : [{ id: 'greeting', role: 'assistant', content: GREETING }])
    setConversationId(restoredConversation.id)
  }, [restoredConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  const saveConversation = useCallback(async (msgs: Message[], existingId: string | null) => {
    const saveable = msgs.filter((m) => m.id !== 'greeting' && m.content.trim())
    if (saveable.length === 0) return existingId

    const firstUser = saveable.find((m) => m.role === 'user')
    const title = firstUser
      ? firstUser.content.slice(0, 80).replace(/\n/g, ' ').trim()
      : 'Untitled'

    const payload = {
      id: existingId ?? undefined,
      title,
      messages: saveable.map((m) => ({ role: m.role, content: m.content })),
    }

    try {
      const res = await fetch('/api/studio/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return existingId
      const data = await res.json()
      return data.id as string
    } catch {
      return existingId
    }
  }, [])

  function startNewConversation() {
    setMessages([{ id: 'greeting', role: 'assistant', content: GREETING }])
    setConversationId(null)
    setInput('')
    onNewConversation?.()
  }

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

    let finalMessages: Message[] = []

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }))

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
              setMessages((prev) => {
                const updated = prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.delta, toolStatus: undefined }
                    : m,
                )
                finalMessages = updated
                return updated
              })
            }

            if (parsed.tool) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, toolStatus: parsed.tool } : m,
                ),
              )
            }

            if (parsed.error) throw new Error(parsed.error)
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
      // Auto-save after each complete exchange
      if (finalMessages.length > 0) {
        const savedId = await saveConversation(finalMessages, conversationId)
        if (savedId && savedId !== conversationId) setConversationId(savedId)
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus('uploading')
    setUploadMessage('')

    try {
      const name = file.name.toLowerCase()
      const isBinary = name.endsWith('.pdf') || name.endsWith('.docx')
      let content: string
      let fileType: 'text' | 'pdf' | 'docx'
      if (isBinary) {
        const buffer = await file.arrayBuffer()
        content = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        fileType = name.endsWith('.docx') ? 'docx' : 'pdf'
      } else {
        content = await file.text()
        fileType = 'text'
      }

      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content, fileType, type: 'resume', isBaseline: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setUploadStatus('success')
      setUploadMessage(`"${file.name}" ingested as baseline resume (${data.chunks} chunks)`)
    } catch (err) {
      setUploadStatus('error')
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
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
      {/* Conversation toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
        <span className="text-xs text-zinc-500">
          {conversationId ? 'Auto-saving' : 'New conversation'}
        </span>
        <button
          onClick={startNewConversation}
          className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
        >
          + New
        </button>
      </div>

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
            accept=".md,.txt,.pdf,.docx"
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
            {uploadStatus === 'uploading' ? 'Uploading…' : 'Upload .md, .txt, .pdf or .docx'}
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
