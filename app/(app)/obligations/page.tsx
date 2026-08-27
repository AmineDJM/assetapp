'use client'

import { ObligationsPanel } from '@/components/obligations/obligations-panel'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import { selectAssetOptions, selectDueObligations } from '@/lib/store/selectors'

/** Un seul rôle : quelles sont toutes mes échéances ? */
export default function ObligationsPage() {
  const { data, today, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  const rows = selectDueObligations(data, today)
  const assets = selectAssetOptions(data)
  const plural = rows.length > 1 ? 's' : ''

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Échéances</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Toutes les obligations actives, triées par date.
        </p>
      </header>

      <ObligationsPanel
        rows={rows}
        today={today}
        assets={assets}
        defaultReminderDays={data.profile.default_reminder_days}
        defaultCurrency={data.profile.default_currency}
        variant="full"
        title={`${rows.length} obligation${plural} active${plural}`}
      />
    </div>
  )
}
