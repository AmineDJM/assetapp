import type { Metadata } from 'next'
import { AssetsView } from '@/components/assets/assets-view'
import { requireSession } from '@/lib/data/session'
import { getAssetsWithSummary } from '@/lib/data/queries'

export const metadata: Metadata = { title: 'Biens' }

export default async function AssetsPage() {
  const { today } = await requireSession()
  const assets = await getAssetsWithSummary(today)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Biens</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Biens immobiliers et véhicules suivis.
        </p>
      </header>

      <AssetsView assets={assets} />
    </div>
  )
}
