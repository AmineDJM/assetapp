'use client'

import { HistoryView } from '@/components/history/history-view'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import { selectAssetOptions, selectHistory } from '@/lib/store/selectors'

/** Un seul rôle : qu'est-ce qui a déjà été effectué ? */
export default function HistoryPage() {
  const { data, today, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Historique</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Échéances validées, de la plus récente à la plus ancienne.
        </p>
      </header>

      <HistoryView rows={selectHistory(data)} assets={selectAssetOptions(data)} today={today} />
    </div>
  )
}
