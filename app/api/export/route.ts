import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csvResponse, jsonDownloadResponse, toCsv } from '@/lib/export/csv'
import { todayInTimeZone } from '@/lib/dates'
import { CALCULATION_BASIS_LABELS, ASSET_TYPE_LABELS, OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy'
import type { ObligationType } from '@/types/domain'

/**
 * Export des données personnelles.
 *
 * Lit à travers le client de session : le RLS garantit qu'un export ne
 * contient que les données de l'utilisateur connecté. Aucun secret, aucune
 * clé, aucun mot de passe n'est jamais exporté.
 */

export const dynamic = 'force-dynamic'

const EXPORT_TYPES = ['assets', 'obligations', 'history', 'backup'] as const
type ExportType = (typeof EXPORT_TYPES)[number]

function isExportType(value: string | null): value is ExportType {
  return value !== null && (EXPORT_TYPES as readonly string[]).includes(value)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type')
  if (!isExportType(type)) {
    return NextResponse.json(
      { error: `Type d'export inconnu. Attendu : ${EXPORT_TYPES.join(', ')}.` },
      { status: 400 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle()

  const stamp = todayInTimeZone(profile?.timezone ?? 'UTC')

  const [assets, obligations, completions] = await Promise.all([
    supabase.from('assets').select('*').order('name'),
    supabase.from('obligations').select('*').order('next_due_date'),
    supabase.from('obligation_completions').select('*').order('completed_date', { ascending: false }),
  ])

  const error = assets.error ?? obligations.error ?? completions.error
  if (error) {
    return NextResponse.json({ error: `Export impossible : ${error.message}` }, { status: 500 })
  }

  const assetRows = assets.data ?? []
  const obligationRows = obligations.data ?? []
  const completionRows = completions.data ?? []
  const assetsById = new Map(assetRows.map((asset) => [asset.id, asset]))
  const obligationsById = new Map(obligationRows.map((obligation) => [obligation.id, obligation]))

  if (type === 'assets') {
    return csvResponse(
      `assets-${stamp}.csv`,
      toCsv(
        ['nom', 'type', 'sous_type', 'pays', 'ville', 'adresse', 'devise', 'actif', 'notes'],
        assetRows.map((asset) => [
          asset.name,
          ASSET_TYPE_LABELS[asset.type],
          asset.subtype,
          asset.country,
          asset.city,
          asset.address,
          asset.default_currency,
          asset.is_active ? 'oui' : 'non',
          asset.notes,
        ]),
      ),
    )
  }

  if (type === 'obligations') {
    return csvResponse(
      `obligations-${stamp}.csv`,
      toCsv(
        [
          'bien',
          'obligation',
          'type',
          'categorie',
          'frequence_jours',
          'base_calcul',
          'prochaine_echeance',
          'montant_prevu',
          'devise',
          'rappels_jours_avant',
          'actif',
          'notes',
        ],
        obligationRows.map((obligation) => [
          assetsById.get(obligation.asset_id)?.name ?? '',
          obligation.name,
          OBLIGATION_TYPE_LABELS[obligation.type as ObligationType],
          obligation.category,
          obligation.frequency_days,
          CALCULATION_BASIS_LABELS[obligation.calculation_basis],
          obligation.next_due_date,
          obligation.expected_amount,
          obligation.currency,
          obligation.reminder_days_before.join(' '),
          obligation.is_active ? 'oui' : 'non',
          obligation.notes,
        ]),
      ),
    )
  }

  if (type === 'history') {
    return csvResponse(
      `history-${stamp}.csv`,
      toCsv(
        [
          'date_prevue',
          'date_realisee',
          'bien',
          'obligation',
          'montant_prevu',
          'montant_reel',
          'ecart',
          'devise',
          'notes',
        ],
        completionRows.map((completion) => {
          const obligation = obligationsById.get(completion.obligation_id)
          const assetName = obligation ? (assetsById.get(obligation.asset_id)?.name ?? '') : ''
          const variance =
            completion.actual_amount !== null && completion.expected_amount_snapshot !== null
              ? completion.actual_amount - completion.expected_amount_snapshot
              : null

          return [
            completion.scheduled_due_date,
            completion.completed_date,
            assetName,
            obligation?.name ?? '',
            completion.expected_amount_snapshot,
            completion.actual_amount,
            variance,
            completion.currency,
            completion.notes,
          ]
        }),
      ),
    )
  }

  return jsonDownloadResponse(`backup-${stamp}.json`, {
    exported_at: new Date().toISOString(),
    version: 1,
    assets: assetRows,
    obligations: obligationRows,
    completions: completionRows,
  })
}
