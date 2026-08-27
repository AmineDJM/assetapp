'use client'

import { cn } from '@/lib/utils/cn'
import type { DueCounts } from '@/lib/filters'
import type { HorizonFilter } from '@/lib/filters'

/**
 * Quatre indicateurs, pas un de plus. Chacun filtre le tableau : lire un
 * chiffre et voir les lignes correspondantes ne demande qu'un clic.
 */
const KPIS: ReadonlyArray<{ key: keyof DueCounts; label: string; horizon: HorizonFilter }> = [
  { key: 'overdue', label: 'En retard', horizon: 'overdue' },
  { key: 'within7', label: '≤ 7 jours', horizon: '7' },
  { key: 'within30', label: '≤ 30 jours', horizon: '30' },
  { key: 'total', label: 'Total actif', horizon: 'all' },
]

export function KpiRow({
  counts,
  active,
  onSelect,
}: {
  counts: DueCounts
  active: HorizonFilter
  onSelect: (horizon: HorizonFilter) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {KPIS.map((kpi) => {
        // « all » est l'état par défaut : le souligner ferait croire à un
        // filtre actif alors que rien n'est filtré.
        const selected = active === kpi.horizon && active !== 'all'
        const value = counts[kpi.key]
        const alert = kpi.key === 'overdue' && value > 0

        return (
          <button
            key={kpi.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(selected && kpi.horizon !== 'all' ? 'all' : kpi.horizon)}
            className={cn(
              'card px-3.5 py-3 text-left transition-colors hover:border-line-strong',
              selected && 'border-ink',
            )}
          >
            <span className="block text-xs text-muted">{kpi.label}</span>
            <span
              className={cn(
                'tabular mt-1 block text-2xl font-semibold tracking-tight',
                alert ? 'text-danger' : 'text-ink',
              )}
            >
              {value}
            </span>
          </button>
        )
      })}
    </div>
  )
}
