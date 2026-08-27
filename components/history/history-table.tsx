import Link from 'next/link'
import { formatShortDate } from '@/lib/dates'
import { formatAmount, formatVariance } from '@/lib/currency'
import { cn } from '@/lib/utils/cn'
import type { CompletionWithContext } from '@/types/domain'

/**
 * Historique : ce qui a déjà été effectué.
 *
 * Le montant prévu affiché est celui figé au moment de la validation
 * (`expected_amount_snapshot`) : modifier l'obligation ne réécrit pas le passé.
 */
export function HistoryTable({
  rows,
  showAsset = true,
}: {
  rows: readonly CompletionWithContext[]
  showAsset?: boolean
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="th text-right">Prévu</th>
              <th className="th text-right">Réalisé</th>
              {showAsset ? <th className="th">Bien</th> : null}
              <th className="th">Obligation</th>
              <th className="th text-right">Montant prévu</th>
              <th className="th text-right">Montant réel</th>
              <th className="th text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const variance = formatVariance(
                row.actual_amount,
                row.expected_amount_snapshot,
                row.currency,
              )
              const over =
                row.actual_amount !== null &&
                row.expected_amount_snapshot !== null &&
                row.actual_amount > row.expected_amount_snapshot

              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="td tabular text-right text-muted">
                    {formatShortDate(row.scheduled_due_date)}
                  </td>
                  <td className="td tabular text-right text-ink">
                    {formatShortDate(row.completed_date)}
                  </td>
                  {showAsset ? (
                    <td className="td">
                      <Link
                        href={`/assets/${row.asset.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {row.asset.name}
                      </Link>
                    </td>
                  ) : null}
                  <td className="td text-ink-soft">{row.obligation.name}</td>
                  <td className="td tabular text-right text-muted">
                    {formatAmount(row.expected_amount_snapshot, row.currency)}
                  </td>
                  <td className="td tabular text-right text-ink">
                    {formatAmount(row.actual_amount, row.currency)}
                  </td>
                  <td
                    className={cn(
                      'td tabular text-right',
                      variance === '—' ? 'text-subtle' : over ? 'text-danger' : 'text-success',
                    )}
                  >
                    {variance}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 py-3.5">
            <div className="min-w-0">
              {showAsset ? (
                <p className="truncate text-[13px] font-medium text-ink">{row.asset.name}</p>
              ) : null}
              <p
                className={cn(
                  'truncate text-[13px]',
                  showAsset ? 'text-muted' : 'font-medium text-ink',
                )}
              >
                {row.obligation.name}
              </p>
              <p className="tabular mt-1 text-xs text-subtle">
                Réalisé le {formatShortDate(row.completed_date)} · prévu le{' '}
                {formatShortDate(row.scheduled_due_date)}
              </p>
            </div>
            <p className="tabular shrink-0 text-right text-[13px] text-ink">
              {formatAmount(row.actual_amount ?? row.expected_amount_snapshot, row.currency)}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
