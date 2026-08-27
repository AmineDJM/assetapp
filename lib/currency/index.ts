/**
 * Formatage monétaire.
 *
 * Aucune conversion n'est faite : additionner des EUR et des DZD produirait un
 * chiffre faux. Les totaux sont toujours groupés par devise.
 */

export const CURRENCY_OPTIONS = [
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'DZD', label: 'DZD — Dinar algérien' },
  { code: 'USD', label: 'USD — Dollar américain' },
  { code: 'GBP', label: 'GBP — Livre sterling' },
  { code: 'CHF', label: 'CHF — Franc suisse' },
  { code: 'CAD', label: 'CAD — Dollar canadien' },
  { code: 'MAD', label: 'MAD — Dirham marocain' },
  { code: 'TND', label: 'TND — Dinar tunisien' },
  { code: 'AED', label: 'AED — Dirham des Émirats' },
] as const

export const DEFAULT_CURRENCY = 'EUR'

const ISO_4217_PATTERN = /^[A-Z]{3}$/

export function isValidCurrencyCode(value: string): boolean {
  return ISO_4217_PATTERN.test(value)
}

export function formatAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale = 'fr-FR',
): string {
  if (amount === null || amount === undefined) return '—'
  const code = currency && isValidCurrencyCode(currency) ? currency : DEFAULT_CURRENCY
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat(locale).format(amount)} ${code}`
  }
}

/** Écart montant réel / montant prévu, signé. */
export function formatVariance(
  actual: number | null | undefined,
  expected: number | null | undefined,
  currency: string | null | undefined,
  locale = 'fr-FR',
): string {
  if (actual === null || actual === undefined) return '—'
  if (expected === null || expected === undefined) return '—'
  const delta = actual - expected
  if (delta === 0) return '—'
  const formatted = formatAmount(Math.abs(delta), currency, locale)
  return delta > 0 ? `+${formatted}` : `−${formatted}`
}

export interface CurrencyTotal {
  currency: string
  total: number
}

/** Regroupe des montants par devise, sans jamais les mélanger. */
export function sumByCurrency(
  entries: ReadonlyArray<{ amount: number | null; currency: string | null }>,
  fallbackCurrency = DEFAULT_CURRENCY,
): CurrencyTotal[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    if (entry.amount === null || entry.amount === undefined) continue
    const code = entry.currency ?? fallbackCurrency
    totals.set(code, (totals.get(code) ?? 0) + entry.amount)
  }
  return Array.from(totals, ([currency, total]) => ({ currency, total })).sort((a, b) =>
    b.total - a.total,
  )
}
