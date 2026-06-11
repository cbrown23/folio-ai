import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getAllFolios } from '@/lib/folios'

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
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Email</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Used</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Budget</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">%</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {folios.map((folio) => {
                const pct = folio.token_budget > 0
                  ? Math.round((folio.tokens_used / folio.token_budget) * 100)
                  : 0
                return (
                  <tr key={folio.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-200 font-medium">{folio.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{folio.slug}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{folio.email}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{(folio.tokens_used / 1000).toFixed(1)}k</td>
                    <td className="px-4 py-3 text-right text-zinc-500">{(folio.token_budget / 1000).toFixed(0)}k</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${pct > 80 ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/folio-ai/${folio.slug}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {folios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                    No folios yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
