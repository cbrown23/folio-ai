'use client'

import config from '../../folio.config'
import { useState } from 'react'

export default function ChatButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Chat panel placeholder */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-white">{config.agent.assistantName}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 px-4 py-6 flex flex-col items-center justify-center gap-3 text-center min-h-48">
            <div className="w-10 h-10 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm text-slate-300 font-medium">{config.agent.greeting}</p>
            <p className="text-xs text-slate-500">Agent coming soon — check back shortly.</p>
          </div>

          <div className="px-4 py-3 border-t border-slate-700">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 opacity-50 cursor-not-allowed">
              <input
                disabled
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-sm text-slate-400 placeholder-slate-600 outline-none"
              />
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition-all hover:scale-105 active:scale-95"
        aria-label="Open chat"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="text-sm font-medium">Ask {config.agent.assistantName}</span>
      </button>
    </>
  )
}
