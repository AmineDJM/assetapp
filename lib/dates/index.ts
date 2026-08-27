import type { DateString } from '@/types/domain'

/**
 * Arithmétique sur les *dates métier*.
 *
 * Une échéance est une date, pas un instant. Tout est manipulé sous la forme
 * `YYYY-MM-DD` et calculé via `Date.UTC`, ce qui rend les opérations
 * insensibles au fuseau du serveur, à l'heure d'été, aux changements de mois,
 * d'année et aux années bissextiles.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

export class InvalidDateStringError extends Error {
  constructor(value: string) {
    super(`Date métier invalide : "${value}" (format attendu : YYYY-MM-DD)`)
    this.name = 'InvalidDateStringError'
  }
}

/** Valide le format ET l'existence réelle de la date (rejette 2026-02-30). */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const [, y, m, d] = match as unknown as [string, string, string, string]
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const utc = new Date(Date.UTC(year, month - 1, day))
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  )
}

export function assertDateString(value: string): DateString {
  if (!isValidDateString(value)) throw new InvalidDateStringError(value)
  return value
}

/** `YYYY-MM-DD` -> instant UTC minuit (usage interne aux calculs). */
export function toUtcDate(value: DateString): Date {
  assertDateString(value)
  const match = DATE_PATTERN.exec(value)!
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
}

/** Instant UTC -> `YYYY-MM-DD`. */
export function fromUtcDate(date: Date): DateString {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Ajoute (ou retire, si négatif) un nombre entier de jours. */
export function addDays(value: DateString, days: number): DateString {
  if (!Number.isInteger(days)) {
    throw new TypeError(`Nombre de jours non entier : ${days}`)
  }
  const base = toUtcDate(value)
  return fromUtcDate(new Date(base.getTime() + days * MS_PER_DAY))
}

/** Nombre de jours entiers de `from` vers `to` (positif si `to` est après). */
export function differenceInDays(to: DateString, from: DateString): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY)
}

export function isBefore(a: DateString, b: DateString): boolean {
  return differenceInDays(a, b) < 0
}

export function isAfter(a: DateString, b: DateString): boolean {
  return differenceInDays(a, b) > 0
}

export function minDateString(a: DateString, b: DateString): DateString {
  return isBefore(a, b) ? a : b
}

/**
 * Date du jour telle que la vit l'utilisateur, dans son fuseau.
 *
 * Sans cela, un utilisateur à Alger verrait « demain » basculer à 23:00 ou à
 * 01:00 selon le fuseau du serveur.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): DateString {
  try {
    // `en-CA` produit directement du `YYYY-MM-DD`.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    // Fuseau inconnu : on retombe sur UTC plutôt que de planter.
    return fromUtcDate(now)
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

/** « 4 septembre 2026 » */
export function formatLongDate(value: DateString, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(value))
}

/** « 04/09/2026 » */
export function formatShortDate(value: DateString, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(value))
}

/** « 4 sept. » — utilisé dans les listes compactes. */
export function formatCompactDate(value: DateString, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(value))
}

/** « jeudi 27 août 2026 » — en-tête du dashboard. */
export function formatWeekdayDate(value: DateString, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(value))
}

/** Horodatage système -> date métier lisible, dans le fuseau de l'utilisateur. */
export function formatTimestamp(
  isoTimestamp: string,
  timeZone: string,
  locale = 'fr-FR',
): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
  }
}
