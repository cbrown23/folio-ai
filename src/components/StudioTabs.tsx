'use client'

import { useState } from 'react'
import StudioChat from './StudioChat'
import DocumentsTable from './DocumentsTable'
import ConversationHistory, { type StoredConversation } from './ConversationHistory'

type Tab = 'chat' | 'documents' | 'history'

type RestoredConversation = {
  id: string
  title: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
} | null

export default function StudioTabs() {
  const [active, setActive] = useState<Tab>('chat')
  const [restoredConversation, setRestoredConversation] = useState<RestoredConversation>(null)

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
        {(['chat', 'history', 'documents'] as Tab[]).map((tab) => (
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
          />
        )}
        {active === 'history' && (
          <ConversationHistory onRestore={handleRestore} />
        )}
        {active === 'documents' && <DocumentsTable />}
      </div>
    </div>
  )
}
