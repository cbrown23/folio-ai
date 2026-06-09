'use client'

import config from '../../folio.config'
import { useState, useRef, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Image from 'next/image'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: config.agent.greeting },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function sendMessage() {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setIsLoading(true)

    // Push an empty assistant message — we'll stream into it
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          let parsed: Record<string, unknown> | null = null
          try {
            parsed = JSON.parse(data)
          } catch {
            continue
          }
          if (parsed?.error) {
            throw new Error(String(parsed.error))
          }
          if (parsed?.delta) {
            assistantText += parsed.delta as string
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                role: 'assistant',
                content: assistantText,
              }
              return updated
            })
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again.",
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-white">
                {config.agent.assistantName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {session?.user && (
                <div className="flex items-center gap-1.5">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-xs text-slate-400">
                    {session.user.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Sign-in gate */}
          {!session?.user ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200 mb-1">{config.agent.greeting}</p>
                <p className="text-xs text-slate-500">Sign in with LinkedIn to start chatting.</p>
              </div>
              <button
                onClick={() => signIn('linkedin', { callbackUrl: window.location.href })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-medium transition-colors"
              >
                <LinkedInIcon className="w-4 h-4" />
                Sign in with LinkedIn
              </button>
            </div>
          ) : (
            <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex items-center gap-1 py-0.5">
                      <span
                        className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-slate-700">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus-within:border-indigo-600 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 transition-colors"
                  aria-label="Send"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition-all hover:scale-105 active:scale-95"
        aria-label="Open chat"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
        <span className="text-sm font-medium">Ask {config.agent.assistantName}</span>
      </button>
    </>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
