import { formatLongDate } from '@/lib/dates'
import { formatDaysRemaining } from '@/lib/recurrence'
import { getReminderCandidate, reminderKey } from '@/lib/reminders/rules'
import type { DateString, DueObligation } from '@/types/domain'

/**
 * Notifications système, envoyées par l'application elle-même.
 *
 * Sans serveur, il n'y a pas de push possible application fermée : une
 * notification push part toujours d'un serveur qui connaît les échéances.
 * Ce que l'on peut faire — et que l'on fait ici — c'est afficher une vraie
 * notification système à l'ouverture de l'application, qui reste ensuite dans
 * le centre de notifications de l'appareil.
 */

export const APP_NAME = 'Patrimoine'

export type NotificationSupport = 'supported' | 'unsupported' | 'denied' | 'granted'

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return 'supported'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export interface DueNotice {
  key: string
  title: string
  body: string
  url: string
}

/** Construit les notices à afficher, une par obligation à échéance. */
export function buildDueNotices(
  rows: readonly DueObligation[],
  today: DateString,
): DueNotice[] {
  return rows.flatMap((row) => {
    const candidate = getReminderCandidate(row, today)
    if (!candidate) return []

    const headline =
      candidate.daysRemaining < 0
        ? `${row.name} — ${row.asset.name} en retard de ${Math.abs(candidate.daysRemaining)} j`
        : candidate.daysRemaining === 0
          ? `${row.name} — ${row.asset.name}`
          : `${row.name} ${row.asset.name} ${formatDaysRemaining(candidate.daysRemaining).toLowerCase()}`

    const detail =
      candidate.daysRemaining === 0
        ? "Échéance aujourd'hui"
        : `Échéance : ${formatLongDate(row.next_due_date)}`

    return [
      {
        key: reminderKey(row.id, candidate.dueDate, candidate.daysBefore, 'local'),
        title: APP_NAME,
        body: `${headline}\n${detail}`,
        url: `/assets/${row.asset_id}?obligation=${row.id}`,
      },
    ]
  })
}

const SHOWN_KEY = 'patrimoine:notified'

function readShown(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SHOWN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function rememberShown(keys: Set<string>): void {
  try {
    // Borné : on ne conserve que les derniers rappels, pas tout l'historique.
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify([...keys].slice(-200)))
  } catch {
    // Stockage indisponible : la notice pourra réapparaître, sans gravité.
  }
}

/**
 * Affiche les notices pas encore vues et renvoie leur nombre.
 * Une même échéance ne notifie qu'une fois par seuil franchi.
 */
export async function showDueNotices(notices: readonly DueNotice[]): Promise<number> {
  if (getNotificationSupport() !== 'granted') return 0

  const shown = readShown()
  const fresh = notices.filter((notice) => !shown.has(notice.key))
  if (fresh.length === 0) return 0

  const registration = await navigator.serviceWorker?.ready.catch(() => null)

  for (const notice of fresh) {
    const options: NotificationOptions & { renotify?: boolean } = {
      body: notice.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: notice.key,
      data: { url: notice.url },
    }

    // Via le Service Worker quand il est disponible : la notification survit à
    // la fermeture de l'onglet et le clic ouvre la bonne page.
    if (registration) await registration.showNotification(notice.title, options)
    else new Notification(notice.title, options)

    shown.add(notice.key)
  }

  rememberShown(shown)
  return fresh.length
}
