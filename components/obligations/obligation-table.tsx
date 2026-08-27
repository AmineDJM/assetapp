'use client'

import Link from 'next/link'
import { Check, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCompactDate, formatShortDate } from '@/lib/dates'
import { formatFrequency } from '@/lib/recurrence'
import { formatAmount } from '@/lib/currency'
import { OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy'
import { cn } from '@/lib/utils/cn'
import type { DueObligation } from '@/types/domain'

/**
 * Liste des échéances.
 *
 * Desktop : tableau complet. Mobile : une carte par échéance — jamais de
 * défilement horizontal.
 */
export interface ObligationTableProps {
  rows: readonly DueObligation[]
  onComplete: (row: DueObligation) => void
  onEdit?: (row: DueObligation) => void
  onArchive?: (row: DueObligation) => void
  /** Le nom du bien est redondant sur la page d'un bien. */
  showAsset?: boolean
  showCategory?: boolean
  showAmount?: boolean
  /** Obligation à mettre en évidence (arrivée depuis une notification). */
  highlightId?: string | null
  emptyState?: React.ReactNode
}

export function ObligationTable({
  rows,
  onComplete,
  onEdit,
  onArchive,
  showAsset = true,
  showCategory = true,
  showAmount = true,
  highlightId = null,
  emptyState,
}: ObligationTableProps) {
  if (rows.length === 0) return <>{emptyState}</>

  const hasMenu = Boolean(onEdit || onArchive)

  return (
    <>
      {/* Le tableau complet demande ~730 px : en dessous de 1024 px la liste
          en cartes reste plus lisible qu'un tableau comprimé. Le conteneur
          défile plutôt que de rogner si la fenêtre est vraiment étroite. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              {showAsset ? <th className="th">Bien</th> : null}
              <th className="th">Obligation</th>
              {showCategory ? <th className="th hidden xl:table-cell">Catégorie</th> : null}
              <th className="th text-right">Fréquence</th>
              <th className="th text-right">Échéance</th>
              {showAmount ? <th className="th hidden text-right xl:table-cell">Montant</th> : null}
              <th className="th text-right">Statut</th>
              <th className="th w-px" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                id={`obligation-${row.id}`}
                className={cn(
                  'border-b border-line last:border-0 hover:bg-canvas/60',
                  row.id === highlightId && 'bg-warning-soft',
                )}
              >
                {showAsset ? (
                  <td className="td whitespace-nowrap">
                    <Link
                      href={`/assets/${row.asset_id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {row.asset.name}
                    </Link>
                  </td>
                ) : null}
                <td className="td whitespace-nowrap">
                  <span className={cn(showAsset ? 'text-ink-soft' : 'font-medium text-ink')}>
                    {row.name}
                  </span>
                </td>
                {showCategory ? (
                  <td className="td hidden whitespace-nowrap text-muted xl:table-cell">
                    {row.category ?? OBLIGATION_TYPE_LABELS[row.type]}
                  </td>
                ) : null}
                <td className="td tabular text-right text-muted">
                  {formatFrequency(row.frequency_days)}
                </td>
                <td className="td tabular text-right text-ink-soft">
                  {formatShortDate(row.next_due_date)}
                </td>
                {showAmount ? (
                  <td className="td tabular hidden text-right text-muted xl:table-cell">
                    {formatAmount(row.expected_amount, row.currency)}
                  </td>
                ) : null}
                <td className="td text-right">
                  <StatusBadge status={row.status} daysRemaining={row.days_remaining} />
                </td>
                <td className="td">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      onClick={() => onComplete(row)}
                      aria-label={`Marquer ${row.name} — ${row.asset.name} comme effectué`}
                    >
                      <Check />
                      Fait
                    </Button>
                    {hasMenu ? (
                      <RowMenu row={row} onEdit={onEdit} onArchive={onArchive} />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile et tablette */}
      <ul className="divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            id={`obligation-mobile-${row.id}`}
            className={cn(
              'flex items-start gap-3 py-3.5',
              row.id === highlightId && '-mx-3 bg-warning-soft px-3',
            )}
          >
            <div className="min-w-0 flex-1">
              {showAsset ? (
                <Link
                  href={`/assets/${row.asset_id}`}
                  className="block truncate text-[13px] font-medium text-ink"
                >
                  {row.asset.name}
                </Link>
              ) : null}
              <p
                className={cn(
                  'truncate text-[13px]',
                  showAsset ? 'text-muted' : 'font-medium text-ink',
                )}
              >
                {row.name}
              </p>
              <p className="tabular mt-1.5 flex items-center gap-2 text-xs text-subtle">
                <span>{formatCompactDate(row.next_due_date)}</span>
                <span aria-hidden>·</span>
                <span>{formatFrequency(row.frequency_days)}</span>
                {showAmount && row.expected_amount !== null ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{formatAmount(row.expected_amount, row.currency)}</span>
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge status={row.status} daysRemaining={row.days_remaining} />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => onComplete(row)}
                  aria-label={`Marquer ${row.name} — ${row.asset.name} comme effectué`}
                >
                  <Check />
                  Fait
                </Button>
                {hasMenu ? <RowMenu row={row} onEdit={onEdit} onArchive={onArchive} /> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function RowMenu({
  row,
  onEdit,
  onArchive,
}: {
  row: DueObligation
  onEdit?: (row: DueObligation) => void
  onArchive?: (row: DueObligation) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${row.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {onEdit ? <DropdownMenuItem onSelect={() => onEdit(row)}>Modifier</DropdownMenuItem> : null}
        <DropdownMenuItem asChild>
          <Link href={`/assets/${row.asset_id}`}>Voir le bien</Link>
        </DropdownMenuItem>
        {onArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={() => onArchive(row)}>
              Archiver
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
