'use client'

import config from '../../folio.config'
import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Image from 'next/image'

export default function ChatButton() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 px-4 py-6 flex flex-col items-center justify-center gap-3 text-center min-h-48">
            <div className="w-10 h-10 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>

            {session?.user ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? ''}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <p className="text-xs text-slate-400">
                    Signed in as <span className="text-slate-300">{session.user.name}</span>
                  </p>
                </div>
                <p className="text-sm text-slate-300 font-medium mt-1">{config.agent.greeting}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-300 font-medium">{config.agent.greeting}</p>
                <button
                  onClick={() => signIn('linkedin', { callbackUrl: window.location.href })}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:border-indigo-600 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <LinkedInIcon className="w-3.5 h-3.5" />
                  Sign in to schedule or generate a resume
                </button>
              </>
            )}

            <p className="text-xs text-slate-500">Agent coming soon — check back shortly.</p>
          </div>

          {/* Input */}
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

      {/* Floating trigger */}
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
