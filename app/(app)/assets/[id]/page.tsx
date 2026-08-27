import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AssetDetail } from '@/components/assets/asset-detail'
import { requireSession } from '@/lib/data/session'
import {
  getAsset,
  getAssetHistory,
  getAssetObligations,
  getAssetOptions,
} from '@/lib/data/queries'
import { isValidUuid } from '@/lib/utils/uuid'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!isValidUuid(id)) return { title: 'Bien' }
  const asset = await getAsset(id)
  return { title: asset?.name ?? 'Bien' }
}

export default async function AssetPage({ params }: PageProps) {
  const { id } = await params
  // Un identifiant malformé ne doit jamais atteindre la base.
  if (!isValidUuid(id)) notFound()

  const { profile, today } = await requireSession()

  const asset = await getAsset(id)
  // Le RLS renvoie déjà `null` pour le bien d'un autre utilisateur.
  if (!asset) notFound()

  const [obligations, history, assets] = await Promise.all([
    getAssetObligations(id, today),
    getAssetHistory(id),
    getAssetOptions(),
  ])

  return (
    <AssetDetail
      asset={asset}
      obligations={obligations}
      history={history}
      assets={assets}
      today={today}
      defaultReminderDays={profile.default_reminder_days}
      defaultCurrency={profile.default_currency}
    />
  )
}
