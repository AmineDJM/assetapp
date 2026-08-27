import { getDaysRemaining, getDueStatus } from '@/lib/recurrence'
import type {
  AssetOption,
  AssetWithSummary,
  CompletionWithContext,
  DateString,
  DueObligation,
} from '@/types/domain'
import type { PatrimoineData } from './schema'

/**
 * Vues dérivées du document.
 *
 * `days_remaining` et `status` ne sont jamais stockés : ils dépendent
 * d'« aujourd'hui » et sont recalculés à chaque lecture.
 */

export function selectDueObligations(
  data: PatrimoineData,
  today: DateString,
  includeArchived = false,
): DueObligation[] {
  const assets = new Map(data.assets.map((asset) => [asset.id, asset]))

  return data.obligations
    .filter((obligation) => {
      const asset = assets.get(obligation.asset_id)
      if (!asset) return false
      if (includeArchived) return true
      return obligation.is_active && asset.is_active
    })
    .map((obligation) => {
      const asset = assets.get(obligation.asset_id)!
      return {
        ...obligation,
        asset: { id: asset.id, name: asset.name, type: asset.type, subtype: asset.subtype },
        days_remaining: getDaysRemaining(obligation.next_due_date, today),
        status: getDueStatus(obligation.next_due_date, today),
      }
    })
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
}

export function selectAssetsWithSummary(
  data: PatrimoineData,
  today: DateString,
  includeArchived = false,
): AssetWithSummary[] {
  const obligations = selectDueObligations(data, today, includeArchived)
  const byAsset = new Map<string, DueObligation[]>()

  for (const obligation of obligations) {
    const list = byAsset.get(obligation.asset_id)
    if (list) list.push(obligation)
    else byAsset.set(obligation.asset_id, [obligation])
  }

  return data.assets
    .filter((asset) => includeArchived || asset.is_active)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((asset) => {
      const list = byAsset.get(asset.id) ?? []
      return { ...asset, obligation_count: list.length, next_obligation: list[0] ?? null }
    })
}

export function selectAssetOptions(data: PatrimoineData): AssetOption[] {
  return data.assets
    .filter((asset) => asset.is_active)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      default_currency: asset.default_currency,
    }))
}

export function selectHistory(data: PatrimoineData): CompletionWithContext[] {
  const obligations = new Map(data.obligations.map((item) => [item.id, item]))
  const assets = new Map(data.assets.map((item) => [item.id, item]))

  return data.completions
    .flatMap((completion) => {
      const obligation = obligations.get(completion.obligation_id)
      if (!obligation) return []
      const asset = assets.get(obligation.asset_id)
      if (!asset) return []

      return [
        {
          ...completion,
          obligation: {
            id: obligation.id,
            name: obligation.name,
            type: obligation.type,
            category: obligation.category,
            frequency_days: obligation.frequency_days,
          },
          asset: { id: asset.id, name: asset.name, type: asset.type },
        },
      ]
    })
    .sort(
      (a, b) =>
        b.completed_date.localeCompare(a.completed_date) ||
        b.created_at.localeCompare(a.created_at),
    )
}

export function selectAssetHistory(
  data: PatrimoineData,
  assetId: string,
  limit = 5,
): CompletionWithContext[] {
  return selectHistory(data)
    .filter((entry) => entry.asset.id === assetId)
    .slice(0, limit)
}

export function selectArchived(data: PatrimoineData) {
  const assets = new Map(data.assets.map((asset) => [asset.id, asset]))
  return {
    assets: data.assets.filter((asset) => !asset.is_active),
    obligations: data.obligations
      .filter((obligation) => !obligation.is_active)
      .map((obligation) => ({
        ...obligation,
        assetName: assets.get(obligation.asset_id)?.name ?? '',
      })),
  }
}
