import type { Metadata } from 'next'
import { ObligationsPanel } from '@/components/obligations/obligations-panel'
import { requireSession } from '@/lib/data/session'
import { getAssetOptions, getDueObligations } from '@/lib/data/queries'

export const metadata: Metadata = { title: 'Échéances' }

/** Un seul rôle : quelles sont toutes mes échéances ? */
export default async function ObligationsPage() {
  const { profile, today } = await requireSession()
  const [rows, assets] = await Promise.all([getDueObligations(today), getAssetOptions()])

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
        defaultReminderDays={profile.default_reminder_days}
        defaultCurrency={profile.default_currency}
        variant="full"
        title={`${rows.length} obligation${rows.length > 1 ? 's' : ''} active${rows.length > 1 ? 's' : ''}`}
      />
    </div>
  )
}
