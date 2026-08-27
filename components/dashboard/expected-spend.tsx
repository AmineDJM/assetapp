import { formatAmount, sumByCurrency } from '@/lib/currency'
import type { DueObligation } from '@/types/domain'

/**
 * Dépenses prévues sur 30 jours.
 *
 * Jamais de total unique : additionner EUR, DZD et USD sans taux de change
 * donnerait un chiffre faux. Chaque devise est affichée séparément.
 */
export function ExpectedSpend({
  rows,
  defaultCurrency,
}: {
  rows: readonly DueObligation[]
  defaultCurrency: string
}) {
  const upcoming = rows.filter((row) => row.days_remaining <= 30)
  const totals = sumByCurrency(
    upcoming.map((row) => ({ amount: row.expected_amount, currency: row.currency })),
    defaultCurrency,
  )

  if (totals.length === 0) return null

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-muted">
      <span>Prévu dans les 30 prochains jours</span>
      {totals.map((total) => (
        <span key={total.currency} className="tabular font-medium text-ink">
          {formatAmount(total.total, total.currency)}
        </span>
      ))}
    </p>
  )
}
