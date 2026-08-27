import type { DateString } from '@/types/domain'
import { formatLongDate } from '@/lib/dates'
import { formatDaysRemaining } from '@/lib/recurrence'

/**
 * Construction des notifications.
 *
 * Confidentialité : le contenu se limite au nom de l'obligation, au bien
 * concerné et à la date. Ni notes, ni montants, ni jeton, ni URL signée — une
 * notification s'affiche sur un écran verrouillé.
 */

export interface PushPayload {
  title: string
  body: string
  url: string
  obligationId?: string
  assetId?: string
  /** Deux rappels identiques se remplacent au lieu de s'empiler. */
  tag?: string
}

export interface ReminderSubject {
  obligationId: string
  obligationName: string
  assetId: string
  assetName: string
  dueDate: DateString
  daysRemaining: number
}

export const APP_NAME = 'Patrimoine'

export function obligationUrl(assetId: string, obligationId: string): string {
  return `/assets/${assetId}?obligation=${obligationId}`
}

/** « Assurance Audi Q3 dans 7 jours » / « Électricité — Appartement Milan ». */
export function reminderHeadline(subject: ReminderSubject): string {
  const { obligationName, assetName, daysRemaining } = subject

  if (daysRemaining < 0) {
    const days = Math.abs(daysRemaining)
    return `${obligationName} ${assetName} en retard de ${days} jour${days > 1 ? 's' : ''}`
  }
  if (daysRemaining === 0) return `${obligationName} — ${assetName}`
  if (daysRemaining === 1) return `${obligationName} ${assetName} demain`
  return `${obligationName} ${assetName} dans ${daysRemaining} jours`
}

export function reminderDetail(subject: ReminderSubject): string {
  if (subject.daysRemaining === 0) return "Échéance aujourd'hui"
  return `Échéance : ${formatLongDate(subject.dueDate)}`
}

export function buildReminderPush(subject: ReminderSubject): PushPayload {
  return {
    title: APP_NAME,
    body: `${reminderHeadline(subject)}\n${reminderDetail(subject)}`,
    url: obligationUrl(subject.assetId, subject.obligationId),
    obligationId: subject.obligationId,
    assetId: subject.assetId,
    tag: `obligation-${subject.obligationId}-${subject.dueDate}`,
  }
}

export function buildTestPush(): PushPayload {
  return {
    title: APP_NAME,
    body: 'Les notifications fonctionnent correctement.',
    url: '/settings',
    tag: 'patrimoine-test',
  }
}

/** Objet et corps de l'email de rappel, en texte simple. */
export function buildReminderEmail(subjects: ReminderSubject[]): {
  subject: string
  text: string
} {
  const first = subjects[0]
  const subject =
    subjects.length === 1 && first
      ? `${APP_NAME} — ${reminderHeadline(first)}`
      : `${APP_NAME} — ${subjects.length} échéances à surveiller`

  const lines = subjects.map((item) => {
    const status = formatDaysRemaining(item.daysRemaining)
    return `• ${item.obligationName} — ${item.assetName}\n  ${formatLongDate(item.dueDate)} · ${status}`
  })

  return {
    subject,
    text: `${subjects.length === 1 ? 'Échéance à venir' : 'Échéances à venir'}\n\n${lines.join('\n\n')}\n`,
  }
}
