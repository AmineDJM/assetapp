import { AppShell } from '@/components/shell/app-shell'
import { AppBadgeSync } from '@/components/shell/app-badge-sync'
import { NotificationBell } from '@/components/shell/notification-bell'
import { QuickAdd } from '@/components/shell/quick-add'
import { UserMenu } from '@/components/shell/user-menu'
import { requireSession } from '@/lib/data/session'
import { getAssetOptions, getDueObligations } from '@/lib/data/queries'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, today } = await requireSession()

  const [rows, assets] = await Promise.all([getDueObligations(today), getAssetOptions()])
  const attention = rows.filter((row) => row.days_remaining <= 0).length

  return (
    <>
      <AppBadgeSync count={attention} />
      <AppShell
        userEmail={user.email ?? ''}
        headerActions={
          <>
            <NotificationBell rows={rows} today={today} />
            <QuickAdd
              assets={assets}
              defaultReminderDays={profile.default_reminder_days}
              defaultCurrency={profile.default_currency}
              today={today}
            />
            <UserMenu email={user.email ?? ''} />
          </>
        }
      >
        {children}
      </AppShell>
    </>
  )
}
