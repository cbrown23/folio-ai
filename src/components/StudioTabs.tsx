'use client'

import { useState, useEffect } from 'react'
import StudioChat from './StudioChat'
import DocumentsTable from './DocumentsTable'
import ConversationHistory, { type StoredConversation } from './ConversationHistory'
import CollectionsTab from './CollectionsTab'

type Tab = 'chat' | 'documents' | 'history' | 'collections'

type RestoredConversation = {
  id: string
  title: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
} | null

type TokenBalance = { budget: number; used: number; remaining: number }

type Props = {
  initialBalance?: TokenBalance | null
  folioSlug?: string
}

export default function StudioTabs({ initialBalance, folioSlug }: Props) {
  const [active, setActive] = useState<Tab>('chat')
  const [restoredConversation, setRestoredConversation] = useState<RestoredConversation>(null)

  // Auto-load the most recently updated conversation on mount
  useEffect(() => {
    let cancelled = false
    async function loadLatest() {
      try {
        const listRes = await fetch('/api/studio/conversations')
        if (!listRes.ok || cancelled) return
        const { conversations } = await listRes.json()
        if (!conversations?.length || cancelled) return

        const convRes = await fetch(`/api/studio/conversations/${conversations[0].id}`)
        if (!convRes.ok || cancelled) return
        const { conversation } = await convRes.json()
        if (!cancelled) {
          setRestoredConversation({
            id: conversation.id,
            title: conversation.title,
            messages: conversation.messages ?? [],
          })
        }
      } catch {
        // silently ignore — just show the greeting instead
      }
    }
    loadLatest()
    return () => { cancelled = true }
  }, [])

  function handleRename(id: string, title: string) {
    setRestoredConversation((prev) => prev?.id === id ? { ...prev, title } : prev)
  }

  function handleRestore(conv: StoredConversation) {
    setRestoredConversation({
      id: conv.id,
      title: conv.title,
      messages: (conv.messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>,
    })
    setActive('chat')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/60 px-4 shrink-0">
        {(['chat', 'history', 'documents', 'collections'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              active === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {active === 'chat' && (
          <StudioChat
            restoredConversation={restoredConversation}
            onNewConversation={() => setRestoredConversation(null)}
            onRename={handleRename}
            initialBalance={initialBalance}
          />
        )}
        {active === 'history' && (
          <ConversationHistory onRestore={handleRestore} />
        )}
        {active === 'documents' && <DocumentsTable folioSlug={folioSlug} />}
        {active === 'collections' && <CollectionsTab folioSlug={folioSlug} />}
      </div>
    </div>
  )
}
