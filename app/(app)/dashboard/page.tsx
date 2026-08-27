'use client'

import { ExpectedSpend } from '@/components/dashboard/expected-spend'
import { WelcomeEmptyState } from '@/components/dashboard/welcome-empty-state'
import { ObligationsPanel } from '@/components/obligations/obligations-panel'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useStore } from '@/lib/store/provider'
import { selectAssetOptions, selectDueObligations } from '@/lib/store/selectors'
import { formatWeekdayDate } from '@/lib/dates'

/** Un seul rôle : que dois-je faire prochainement ? */
export default function DashboardPage() {
  const { data, today, hydrated } = useStore()

  if (!hydrated) return <PageSkeleton />

  const rows = selectDueObligations(data, today)
  const assets = selectAssetOptions(data)
  const greeting = data.profile.display_name ? `Bonjour ${data.profile.display_name}` : 'Bonjour'

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{greeting}</h1>
        <p className="mt-0.5 text-[13px] text-muted first-letter:uppercase">
          {formatWeekdayDate(today)}
        </p>
      </header>

      {assets.length === 0 ? (
        <WelcomeEmptyState />
      ) : (
        <>
          <ObligationsPanel
            rows={rows}
            today={today}
            assets={assets}
            defaultReminderDays={data.profile.default_reminder_days}
            defaultCurrency={data.profile.default_currency}
            variant="dashboard"
            title="Prochaines échéances"
          />
          <div className="mt-4">
            <ExpectedSpend rows={rows} defaultCurrency={data.profile.default_currency} />
          </div>
        </>
      )}
    </div>
  )
}
