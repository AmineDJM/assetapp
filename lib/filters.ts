import type { DueObligation } from '@/types/domain'

/** Filtres partagés par le dashboard et la page Échéances. */

export type ScopeFilter = 'all' | 'property' | 'vehicle'
export type HorizonFilter = 'all' | 'overdue' | '7' | '30' | '90'

export interface ObligationFilters {
  scope: ScopeFilter
  horizon: HorizonFilter
  search: string
  assetId: string
  category: string
  type: string
}

export const ALL = 'all'

export const EMPTY_FILTERS: ObligationFilters = {
  scope: ALL,
  horizon: ALL,
  search: '',
  assetId: ALL,
  category: ALL,
  type: ALL,
}

function matchesHorizon(row: DueObligation, horizon: HorizonFilter): boolean {
  switch (horizon) {
    case 'overdue':
      return row.days_remaining < 0
    case '7':
      return row.days_remaining <= 7
    case '30':
      return row.days_remaining <= 30
    case '90':
      return row.days_remaining <= 90
    case 'all':
      return true
  }
}

/** Recherche sur le bien, l'obligation et la catégorie. */
function matchesSearch(row: DueObligation, needle: string): boolean {
  if (needle === '') return true
  const haystack = [row.name, row.asset.name, row.category ?? '', row.asset.subtype ?? '']
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function filterObligations(
  rows: readonly DueObligation[],
  filters: ObligationFilters,
): DueObligation[] {
  const needle = filters.search.trim().toLowerCase()

  return rows.filter((row) => {
    if (filters.scope !== ALL && row.asset.type !== filters.scope) return false
    if (filters.assetId !== ALL && row.asset_id !== filters.assetId) return false
    if (filters.category !== ALL && (row.category ?? '') !== filters.category) return false
    if (filters.type !== ALL && row.type !== filters.type) return false
    if (!matchesHorizon(row, filters.horizon)) return false
    return matchesSearch(row, needle)
  })
}

export interface DueCounts {
  overdue: number
  within7: number
  within30: number
  total: number
}

/** Les quatre indicateurs du dashboard. */
export function countByHorizon(rows: readonly DueObligation[]): DueCounts {
  let overdue = 0
  let within7 = 0
  let within30 = 0

  for (const row of rows) {
    if (row.days_remaining < 0) overdue += 1
    if (row.days_remaining >= 0 && row.days_remaining <= 7) within7 += 1
    if (row.days_remaining >= 0 && row.days_remaining <= 30) within30 += 1
  }

  return { overdue, within7, within30, total: rows.length }
}
