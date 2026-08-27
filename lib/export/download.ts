/**
 * Export et sauvegarde.
 *
 * Tout se passe dans le navigateur : le fichier est construit en mémoire puis
 * remis au navigateur. Aucune donnée ne transite par un serveur.
 */

import { CALCULATION_BASIS_LABELS, ASSET_TYPE_LABELS, OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy'
import type { PatrimoineData } from '@/lib/store/schema'

const FORMULA_PREFIX = /^[=+@\t\r]/

/**
 * Les cellules commençant par `=`, `+`, `@` ou une tabulation sont préfixées
 * d'une apostrophe : sans cela, un tableur interpréterait le contenu comme une
 * formule. Les nombres négatifs restent intacts.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  let text = String(value)
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  // BOM : Excel ouvre alors correctement les accents.
  return `﻿${lines.join('\r\n')}\r\n`
}

export function buildAssetsCsv(data: PatrimoineData): string {
  return toCsv(
    ['nom', 'type', 'sous_type', 'pays', 'ville', 'adresse', 'devise', 'actif', 'notes'],
    data.assets.map((asset) => [
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
  )
}

export function buildObligationsCsv(data: PatrimoineData): string {
  const assets = new Map(data.assets.map((asset) => [asset.id, asset.name]))
  return toCsv(
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
    data.obligations.map((obligation) => [
      assets.get(obligation.asset_id) ?? '',
      obligation.name,
      OBLIGATION_TYPE_LABELS[obligation.type],
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
  )
}

export function buildHistoryCsv(data: PatrimoineData): string {
  const obligations = new Map(data.obligations.map((item) => [item.id, item]))
  const assets = new Map(data.assets.map((item) => [item.id, item.name]))

  return toCsv(
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
    [...data.completions]
      .sort((a, b) => b.completed_date.localeCompare(a.completed_date))
      .map((completion) => {
        const obligation = obligations.get(completion.obligation_id)
        const variance =
          completion.actual_amount !== null && completion.expected_amount_snapshot !== null
            ? completion.actual_amount - completion.expected_amount_snapshot
            : null

        return [
          completion.scheduled_due_date,
          completion.completed_date,
          obligation ? (assets.get(obligation.asset_id) ?? '') : '',
          obligation?.name ?? '',
          completion.expected_amount_snapshot,
          completion.actual_amount,
          variance,
          completion.currency,
          completion.notes,
        ]
      }),
  )
}

export function buildBackupJson(data: PatrimoineData): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      version: data.version,
      profile: data.profile,
      assets: data.assets,
      obligations: data.obligations,
      completions: data.completions,
    },
    null,
    2,
  )
}

/** Remet un fichier au navigateur. */
export function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Libéré au tour suivant : Safari a besoin que l'URL vive le temps du clic.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
