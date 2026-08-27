import type { DateString } from '@/types/domain'
import { getDaysRemaining } from '@/lib/recurrence'

/**
 * Règles de déclenchement des rappels.
 *
 * Un rappel est identifié de façon unique par le quadruplet
 * `(obligation_id, due_date, days_before, channel)`. La table `reminder_logs`
 * porte la contrainte d'unicité correspondante : c'est elle, et non le code,
 * qui garantit l'absence de doublon même si le cron est rejoué.
 */

/**
 * Sentinelle « en retard ».
 *
 * Une obligation en retard doit alerter, mais une seule fois par échéance —
 * sinon elle notifierait chaque jour jusqu'à validation. On enregistre donc un
 * unique log `days_before = -1` par (obligation, échéance, canal).
 */
export const OVERDUE_REMINDER_MARKER = -1

export interface ReminderCandidate {
  obligationId: string
  dueDate: DateString
  daysBefore: number
  daysRemaining: number
}

/**
 * Détermine si une obligation doit déclencher un rappel aujourd'hui, et
 * sous quel `days_before`. Renvoie `null` s'il n'y a rien à envoyer.
 */
export function getReminderCandidate(
  obligation: { id: string; next_due_date: DateString; reminder_days_before: number[] },
  today: DateString,
): ReminderCandidate | null {
  const daysRemaining = getDaysRemaining(obligation.next_due_date, today)

  if (daysRemaining < 0) {
    return {
      obligationId: obligation.id,
      dueDate: obligation.next_due_date,
      daysBefore: OVERDUE_REMINDER_MARKER,
      daysRemaining,
    }
  }

  const thresholds = normalizeReminderDays(obligation.reminder_days_before)
  if (!thresholds.includes(daysRemaining)) return null

  return {
    obligationId: obligation.id,
    dueDate: obligation.next_due_date,
    daysBefore: daysRemaining,
    daysRemaining,
  }
}

/**
 * Un rappel n'est envoyé que si le quadruplet exact n'a pas déjà été journalisé.
 * `alreadySent` provient de `reminder_logs`.
 */
export function shouldSendReminder(
  candidate: ReminderCandidate,
  channel: string,
  alreadySent: ReadonlySet<string>,
): boolean {
  return !alreadySent.has(
    reminderKey(candidate.obligationId, candidate.dueDate, candidate.daysBefore, channel),
  )
}

/**
 * Clé d'unicité d'un rappel — le même quadruplet que la contrainte
 * `reminder_logs_unique`. L'identifiant de l'obligation en fait partie :
 * deux obligations d'un même utilisateur peuvent parfaitement tomber le même
 * jour avec le même seuil, et chacune doit être notifiée.
 */
export function reminderKey(
  obligationId: string,
  dueDate: DateString,
  daysBefore: number,
  channel: string,
): string {
  return `${obligationId}|${dueDate}|${daysBefore}|${channel}`
}

/** Nettoie une liste de seuils : entiers >= 0, dédupliqués, décroissants. */
export function normalizeReminderDays(values: readonly number[]): number[] {
  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value >= 0)),
  ).sort((a, b) => b - a)
}

/** « 30 jours avant », « Jour J ». */
export function formatReminderThreshold(daysBefore: number): string {
  if (daysBefore === OVERDUE_REMINDER_MARKER) return 'En retard'
  if (daysBefore === 0) return 'Jour J'
  if (daysBefore === 1) return '1 jour avant'
  return `${daysBefore} jours avant`
}

export const DEFAULT_REMINDER_DAYS = [30, 7, 1, 0] as const
export const REMINDER_PRESET_OPTIONS = [60, 30, 14, 7, 3, 1, 0] as const
