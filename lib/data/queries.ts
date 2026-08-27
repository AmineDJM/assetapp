import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDaysRemaining, getDueStatus } from '@/lib/recurrence'
import type {
  Asset,
  CompletionWithContext,
  DateString,
  DueObligation,
  Obligation,
  ObligationWithAsset,
} from '@/types/domain'

/**
 * Lectures serveur.
 *
 * Toutes passent par le client lié à la session : le RLS filtre déjà sur
 * `user_id`, les filtres explicites ci-dessous ne sont qu'une seconde barrière.
 *
 * Les champs calculés (`days_remaining`, `status`) ne sont jamais stockés : ils
 * dépendent d'« aujourd'hui » et sont dérivés à chaque lecture.
 */

const OBLIGATION_WITH_ASSET_SELECT = `
  *,
  asset:assets!inner (id, name, type, subtype)
` as const

/** Le join Supabase renvoie l'asset imbriqué : on le normalise. */
function decorate(rows: ObligationWithAsset[], today: DateString): DueObligation[] {
  return rows
    .map((row) => ({
      ...row,
      days_remaining: getDaysRemaining(row.next_due_date, today),
      status: getDueStatus(row.next_due_date, today),
    }))
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
}

/**
 * Mémoïsé par requête HTTP : le layout (cloche de notifications) et la page
 * consomment la même liste sans interroger la base deux fois.
 */
export const getDueObligations = cache(
  async (today: DateString, includeArchived = false): Promise<DueObligation[]> => {
    const supabase = await createClient()

    let query = supabase
      .from('obligations')
      .select(OBLIGATION_WITH_ASSET_SELECT)
      .order('next_due_date', { ascending: true })

    if (!includeArchived) {
      query = query.eq('is_active', true).eq('assets.is_active', true)
    }

    const { data, error } = await query
    if (error) throw new Error(`Lecture des échéances impossible : ${error.message}`)

    return decorate((data ?? []) as unknown as ObligationWithAsset[], today)
  },
)

export interface AssetWithSummary extends Asset {
  obligation_count: number
  next_obligation: DueObligation | null
}

export async function getAssetsWithSummary(
  today: DateString,
  includeArchived = false,
): Promise<AssetWithSummary[]> {
  const supabase = await createClient()

  let assetQuery = supabase.from('assets').select('*').order('name', { ascending: true })
  if (!includeArchived) assetQuery = assetQuery.eq('is_active', true)

  const [{ data: assets, error: assetError }, obligations] = await Promise.all([
    assetQuery,
    getDueObligations(today, includeArchived),
  ])

  if (assetError) throw new Error(`Lecture des biens impossible : ${assetError.message}`)

  const byAsset = new Map<string, DueObligation[]>()
  for (const obligation of obligations) {
    const list = byAsset.get(obligation.asset_id)
    if (list) list.push(obligation)
    else byAsset.set(obligation.asset_id, [obligation])
  }

  return (assets ?? []).map((asset) => {
    const list = byAsset.get(asset.id) ?? []
    return {
      ...asset,
      obligation_count: list.length,
      next_obligation: list[0] ?? null,
    }
  })
}

export async function getAsset(assetId: string): Promise<Asset | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle()

  if (error) throw new Error(`Lecture du bien impossible : ${error.message}`)
  return data
}

export async function getAssetObligations(
  assetId: string,
  today: DateString,
  includeArchived = false,
): Promise<DueObligation[]> {
  const supabase = await createClient()

  let query = supabase
    .from('obligations')
    .select(OBLIGATION_WITH_ASSET_SELECT)
    .eq('asset_id', assetId)
    .order('next_due_date', { ascending: true })

  if (!includeArchived) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(`Lecture des obligations impossible : ${error.message}`)

  return decorate((data ?? []) as unknown as ObligationWithAsset[], today)
}

export async function getObligation(obligationId: string): Promise<Obligation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .maybeSingle()

  if (error) throw new Error(`Lecture de l’obligation impossible : ${error.message}`)
  return data
}

export type AssetOption = Pick<Asset, 'id' | 'name' | 'type' | 'default_currency'>

export const getAssetOptions = cache(async (): Promise<AssetOption[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, type, default_currency')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`Lecture des biens impossible : ${error.message}`)
  return data ?? []
})

export const getHistory = cache(async (limit = 200): Promise<CompletionWithContext[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obligation_completions')
    .select(
      `
      *,
      obligation:obligations!inner (
        id, name, type, category, frequency_days,
        asset:assets!inner (id, name, type)
      )
    `,
    )
    .order('completed_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Lecture de l’historique impossible : ${error.message}`)

  type Row = CompletionWithContext & {
    obligation: CompletionWithContext['obligation'] & {
      asset: CompletionWithContext['asset']
    }
  }

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const { asset, ...obligation } = row.obligation
    return { ...row, obligation, asset }
  })
})

export async function getAssetHistory(
  assetId: string,
  limit = 5,
): Promise<CompletionWithContext[]> {
  const all = await getHistory(200)
  return all.filter((entry) => entry.asset.id === assetId).slice(0, limit)
}

export interface PushDevice {
  id: string
  device_name: string | null
  endpoint: string
  created_at: string
  last_used_at: string | null
}

export async function getPushDevices(): Promise<PushDevice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, device_name, endpoint, created_at, last_used_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Lecture des appareils impossible : ${error.message}`)
  return data ?? []
}
