import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import StudioChat from '@/components/StudioChat'
import config from '../../../folio.config'

export const metadata = {
  title: 'Content Studio — folio-ai',
  robots: 'noindex, nofollow',
}

export default async function StudioPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  if (session.user.email !== config.owner.email) {
    redirect('/')
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold tracking-wide text-zinc-200">
            Content Studio
          </span>
          <span className="text-xs text-zinc-500 border border-zinc-700 rounded px-2 py-0.5">
            owner only
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{session.user.name}</span>
          <span>·</span>
          <a href="/" className="hover:text-zinc-300 transition-colors">
            Back to site
          </a>
        </div>
      </header>

      {/* Chat takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <StudioChat />
      </div>
    </div>
  )
}
