import { addDays, assertDateString, differenceInDays, isAfter } from '@/lib/dates'
import type { CalculationBasis, DateString, DueStatus } from '@/types/domain'

/**
 * Moteur de récurrence.
 *
 * Règle unique et sans ambiguïté : une fréquence est un **nombre entier de
 * jours**. Aucune notion de « mensuel », « trimestriel » ou « annuel »
 * n'existe ici ni en base.
 *
 * Ces fonctions sont pures et indépendantes de React, de la base de données et
 * de l'horloge système : « aujourd'hui » est toujours passé en paramètre.
 */

/** Seuil au-delà duquel une échéance n'est plus considérée « proche ». */
export const SOON_THRESHOLD_DAYS = 7

export class InvalidFrequencyError extends Error {
  constructor(value: number) {
    super(`Fréquence invalide : ${value} (un entier >= 1 est attendu)`)
    this.name = 'InvalidFrequencyError'
  }
}

export function assertFrequencyDays(frequencyDays: number): number {
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
    throw new InvalidFrequencyError(frequencyDays)
  }
  return frequencyDays
}

export interface CalculateNextDueDateInput {
  /** Échéance en cours, celle qui vient d'être honorée. */
  currentDueDate: DateString
  /** Date à laquelle l'action a réellement été effectuée. */
  completionDate: DateString
  frequencyDays: number
  calculationBasis: CalculationBasis
}

/**
 * Calcule la prochaine échéance après une réalisation.
 *
 * - `scheduled` : le calendrier prévu fait foi. Payer avec 4 jours de retard
 *   ne décale pas la série — on repart de l'échéance prévue.
 * - `completion` : la date réelle fait foi. Un entretien fait le 5 septembre
 *   avec une fréquence de 180 jours redonne le 4 mars suivant.
 */
export function calculateNextDueDate({
  currentDueDate,
  completionDate,
  frequencyDays,
  calculationBasis,
}: CalculateNextDueDateInput): DateString {
  assertFrequencyDays(frequencyDays)
  assertDateString(currentDueDate)
  assertDateString(completionDate)

  const base = calculationBasis === 'completion' ? completionDate : currentDueDate
  return addDays(base, frequencyDays)
}

/**
 * Ajoute `frequencyDays` autant de fois que nécessaire pour dépasser `today`.
 *
 * Utilisé uniquement sur action explicite de l'utilisateur : rattraper un
 * retard silencieusement effacerait des échéances réellement dues.
 */
export function advanceUntilFutureDate(
  dueDate: DateString,
  frequencyDays: number,
  today: DateString,
): DateString {
  assertFrequencyDays(frequencyDays)
  assertDateString(dueDate)
  assertDateString(today)

  if (isAfter(dueDate, today)) return dueDate

  const gap = differenceInDays(today, dueDate)
  // Un seul saut : évite une boucle sur des retards de plusieurs années.
  const steps = Math.floor(gap / frequencyDays) + 1
  return addDays(dueDate, steps * frequencyDays)
}

/** Positif = à venir, 0 = aujourd'hui, négatif = en retard. */
export function getDaysRemaining(nextDueDate: DateString, today: DateString): number {
  return differenceInDays(nextDueDate, today)
}

export function getDueStatus(nextDueDate: DateString, today: DateString): DueStatus {
  const days = getDaysRemaining(nextDueDate, today)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= SOON_THRESHOLD_DAYS) return 'soon'
  return 'upcoming'
}

/** « Aujourd'hui », « Demain », « Dans 8 j », « En retard de 3 j ». */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining === 0) return "Aujourd'hui"
  if (daysRemaining === 1) return 'Demain'
  if (daysRemaining === -1) return 'En retard de 1 j'
  if (daysRemaining < 0) return `En retard de ${Math.abs(daysRemaining)} j`
  return `Dans ${daysRemaining} j`
}

/** « 365 j » — la fréquence est toujours affichée en jours, sans traduction. */
export function formatFrequency(frequencyDays: number): string {
  return `${frequencyDays} j`
}

/**
 * Aperçu de la prochaine échéance à partir d'une date de référence.
 * Alimente le formulaire de création : l'utilisateur voit le résultat du
 * calcul avant d'enregistrer.
 */
export function previewNextDueDate(
  referenceDate: DateString,
  frequencyDays: number,
): DateString {
  assertFrequencyDays(frequencyDays)
  return addDays(referenceDate, frequencyDays)
}

/** Trie les échéances : les retards d'abord, puis par date croissante. */
export function compareByDueDate(
  a: { next_due_date: DateString },
  b: { next_due_date: DateString },
): number {
  return a.next_due_date < b.next_due_date ? -1 : a.next_due_date > b.next_due_date ? 1 : 0
}
