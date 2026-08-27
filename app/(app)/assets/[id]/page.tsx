'use client'

import { use } from 'react'
import { AssetDetail } from '@/components/assets/asset-detail'
import { NotFoundInline } from '@/components/ui/not-found-inline'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import {
  selectAssetHistory,
  selectAssetOptions,
  selectDueObligations,
} from '@/lib/store/selectors'

export default function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, today, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  const asset = data.assets.find((item) => item.id === id)
  if (!asset) {
    return (
      <NotFoundInline
        title="Bien introuvable"
        description="Ce bien n’existe pas ou a été supprimé."
      />
    )
  }

  return (
    <AssetDetail
      asset={asset}
      obligations={selectDueObligations(data, today, true).filter(
        (row) => row.asset_id === id && (row.is_active || !asset.is_active),
      )}
      history={selectAssetHistory(data, id)}
      assets={selectAssetOptions(data)}
      today={today}
      defaultReminderDays={data.profile.default_reminder_days}
      defaultCurrency={data.profile.default_currency}
    />
  )
}
