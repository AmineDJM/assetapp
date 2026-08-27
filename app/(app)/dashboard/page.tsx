import type { Metadata } from 'next'
import { ExpectedSpend } from '@/components/dashboard/expected-spend'
import { ObligationsPanel } from '@/components/obligations/obligations-panel'
import { WelcomeEmptyState } from '@/components/dashboard/welcome-empty-state'
import { requireSession } from '@/lib/data/session'
import { getAssetOptions, getDueObligations } from '@/lib/data/queries'
import { formatWeekdayDate } from '@/lib/dates'

export const metadata: Metadata = { title: 'Dashboard' }

/** Un seul rôle : que dois-je faire prochainement ? */
export default async function DashboardPage() {
  const { profile, today } = await requireSession()
  const [rows, assets] = await Promise.all([getDueObligations(today), getAssetOptions()])

  const greeting = profile.display_name ? `Bonjour ${profile.display_name}` : 'Bonjour'

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
            defaultReminderDays={profile.default_reminder_days}
            defaultCurrency={profile.default_currency}
            variant="dashboard"
            title="Prochaines échéances"
          />
          <div className="mt-4">
            <ExpectedSpend rows={rows} defaultCurrency={profile.default_currency} />
          </div>
        </>
      )}
    </div>
  )
}
