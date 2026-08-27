'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatLongDate } from '@/lib/dates'
import { formatDaysRemaining } from '@/lib/recurrence'
import { getReminderCandidate, reminderKey } from '@/lib/reminders/rules'
import { cn } from '@/lib/utils/cn'
import { useDismissedAlerts } from '@/hooks/use-dismissed-alerts'
import type { DueObligation } from '@/types/domain'

/**
 * Alertes in-app.
 *
 * Calculées à partir des mêmes seuils que les rappels push et email : une
 * alerte apparaît quand `daysRemaining` correspond à un `reminder_days_before`,
 * ou quand l'échéance est dépassée.
 *
 * Les alertes écartées sont mémorisées localement (par échéance et par seuil) :
 * une même alerte ne réapparaît pas à chaque chargement de page.
 */
interface Alert {
  key: string
  obligation: DueObligation
  daysRemaining: number
}

export function NotificationBell({
  rows,
  today,
}: {
  rows: DueObligation[]
  today: string
}) {
  const { dismissed, dismiss } = useDismissedAlerts()

  const alerts = useMemo<Alert[]>(() => {
    return rows.flatMap((row) => {
      const candidate = getReminderCandidate(row, today)
      if (!candidate) return []
      const key = reminderKey(row.id, candidate.dueDate, candidate.daysBefore, 'in-app')
      if (dismissed.has(key)) return []
      return [{ key, obligation: row, daysRemaining: candidate.daysRemaining }]
    })
  }, [rows, today, dismissed])

  function dismissAll() {
    dismiss(alerts.map((alert) => alert.key))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={
            alerts.length > 0 ? `Notifications — ${alerts.length} en attente` : 'Notifications'
          }
          className="relative"
        >
          <Bell />
          {alerts.length > 0 ? (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="px-0 py-0">Notifications</DropdownMenuLabel>
          {alerts.length > 0 ? (
            <button
              type="button"
              onClick={dismissAll}
              className="text-xs text-muted transition-colors hover:text-ink"
            >
              Tout marquer comme lu
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />

        {alerts.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted">
            Aucune alerte pour le moment.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {alerts.map((alert) => (
              <li key={alert.key}>
                <Link
                  href={`/assets/${alert.obligation.asset_id}?obligation=${alert.obligation.id}`}
                  className="block px-3 py-2 transition-colors hover:bg-surface-muted"
                >
                  <p className="text-[13px] font-medium text-ink">
                    {alert.obligation.name} · {alert.obligation.asset.name}
                  </p>
                  <p
                    className={cn(
                      'text-xs',
                      alert.daysRemaining < 0 ? 'text-danger' : 'text-muted',
                    )}
                  >
                    {formatDaysRemaining(alert.daysRemaining)} ·{' '}
                    {formatLongDate(alert.obligation.next_due_date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
