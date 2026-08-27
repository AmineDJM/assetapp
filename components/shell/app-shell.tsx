'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useStore } from '@/lib/store/provider'
import { selectAssetOptions, selectDueObligations } from '@/lib/store/selectors'
import { AppBadgeSync } from './app-badge-sync'
import { NotificationBell } from './notification-bell'
import { QuickAdd } from './quick-add'
import { StorageWarning } from './storage-warning'
import { isActivePath, NAV_ITEMS } from './nav'

/**
 * Coque applicative.
 *
 * Desktop : barre latérale étroite. Mobile : en-tête compact et barre
 * d'onglets en bas, dans la zone du pouce.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find((item) => isActivePath(pathname, item.href))
  const { data, today, hydrated } = useStore()

  const rows = selectDueObligations(data, today)
  const assets = selectAssetOptions(data)
  const attention = rows.filter((row) => row.days_remaining <= 0).length

  const headerActions = (
    <>
      <NotificationBell rows={rows} today={today} />
      <QuickAdd
        assets={assets}
        defaultReminderDays={data.profile.default_reminder_days}
        defaultCurrency={data.profile.default_currency}
        today={today}
      />
    </>
  )

  return (
    <div className="min-h-dvh">
      <AppBadgeSync count={hydrated ? attention : 0} />
      {/* Barre latérale — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight text-ink">
            Patrimoine
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-surface-muted text-ink'
                    : 'text-muted hover:bg-surface-muted hover:text-ink',
                )}
              >
                <item.icon className={cn('size-4', active ? 'text-ink' : 'text-subtle')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs text-subtle">Données locales à cet appareil</p>
        </div>
      </aside>

      {/* En-tête — mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          {current?.label ?? 'Patrimoine'}
        </span>
        <div className="flex items-center gap-1.5">{headerActions}</div>
      </header>

      <div className="lg:pl-56">
        {/* En-tête — desktop */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-end gap-1.5 border-b border-line bg-canvas/85 px-8 backdrop-blur-md lg:flex">
          {headerActions}
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          <StorageWarning />
          {children}
        </main>
      </div>

      {/* Onglets — mobile */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-ink' : 'text-subtle',
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
