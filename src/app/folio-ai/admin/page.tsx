import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getAllFolios } from '@/lib/folios'
import AdminFolioTable from '@/components/AdminFolioTable'

export const metadata = {
  title: 'Admin — folio-ai',
  robots: 'noindex, nofollow',
}

export default async function FolioAdminPage() {
  const session = await auth()
  const ownerEmail = process.env.OWNER_EMAIL

  if (!session?.user?.email) redirect('/')
  if (ownerEmail && session.user.email !== ownerEmail) redirect('/')

  const folios = await getAllFolios()

  const totalBudget = folios.reduce((s, f) => s + f.token_budget, 0)
  const totalUsed = folios.reduce((s, f) => s + f.tokens_used, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-semibold tracking-wide text-zinc-200">folio-ai Admin</span>
        </div>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Home
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-xs text-zinc-500 mb-1">Total Folios</p>
            <p className="text-3xl font-bold text-white">{folios.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-xs text-zinc-500 mb-1">Tokens Used</p>
            <p className="text-3xl font-bold text-white">{(totalUsed / 1000).toFixed(1)}k</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-xs text-zinc-500 mb-1">Total Budget</p>
            <p className="text-3xl font-bold text-white">{(totalBudget / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Folio table */}
        <h2 className="text-lg font-semibold text-white mb-4">Folios</h2>
        <AdminFolioTable folios={folios} />
      </main>
    </div>
  )
}
