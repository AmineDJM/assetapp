import { AppShell } from '@/components/shell/app-shell'
import { AppBadgeSync } from '@/components/shell/app-badge-sync'
import { NotificationBell } from '@/components/shell/notification-bell'
import { QuickAdd } from '@/components/shell/quick-add'
import { UserMenu } from '@/components/shell/user-menu'
import { DatabaseNotReadyScreen, MissingEnvScreen } from '@/components/shell/setup-required'
import { requireSession } from '@/lib/data/session'
import { getAssetOptions, getDueObligations } from '@/lib/data/queries'
import { diagnoseDatabaseError, getMissingRequiredEnv } from '@/lib/config'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Vérifié avant tout appel réseau : sans ces variables, rien ne peut
  // fonctionner et l'utilisateur doit savoir précisément quoi renseigner.
  const missing = getMissingRequiredEnv()
  if (missing.length > 0) return <MissingEnvScreen missing={missing} />

  const { user, profile, today } = await requireSession()

  let rows, assets
  try {
    ;[rows, assets] = await Promise.all([getDueObligations(today), getAssetOptions()])
  } catch (error) {
    // Base joignable mais non migrée : la consigne est actionnable, pas une 500.
    const diagnosis = diagnoseDatabaseError(error)
    if (diagnosis) return <DatabaseNotReadyScreen diagnosis={diagnosis} />
    throw error
  }

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
