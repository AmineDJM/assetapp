'use client'

import { AssetsView } from '@/components/assets/assets-view'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import { selectAssetsWithSummary } from '@/lib/store/selectors'

/** Un seul rôle : qu'est-ce que je possède ou gère ? */
export default function AssetsPage() {
  const { data, today, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Biens</h1>
        <p className="mt-0.5 text-[13px] text-muted">Biens immobiliers et véhicules suivis.</p>
      </header>

      <AssetsView assets={selectAssetsWithSummary(data, today)} />
    </div>
  )
}
