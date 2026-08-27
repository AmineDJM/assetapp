import type { Metadata } from 'next'
import { HistoryView } from '@/components/history/history-view'
import { requireSession } from '@/lib/data/session'
import { getAssetOptions, getHistory } from '@/lib/data/queries'

export const metadata: Metadata = { title: 'Historique' }

export default async function HistoryPage() {
  const { today } = await requireSession()
  const [rows, assets] = await Promise.all([getHistory(), getAssetOptions()])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Historique</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Échéances validées, de la plus récente à la plus ancienne.
        </p>
      </header>

      <HistoryView rows={rows} assets={assets} today={today} />
    </div>
  )
}
