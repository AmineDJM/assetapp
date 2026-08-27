import Link from 'next/link'
import { Building2, Car } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'
import { formatCompactDate } from '@/lib/dates'
import { ASSET_TYPE_LABELS } from '@/lib/taxonomy'
import type { AssetWithSummary } from '@/types/domain'

/** Carte de bien : nom, nature, nombre d'obligations, prochaine échéance. */
export function AssetCard({ asset }: { asset: AssetWithSummary }) {
  const Icon = asset.type === 'vehicle' ? Car : Building2
  const next = asset.next_obligation

  return (
    <Link
      href={`/assets/${asset.id}`}
      className="card flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {asset.subtype ?? ASSET_TYPE_LABELS[asset.type]}
            {asset.city ? ` · ${asset.city}` : ''}
            {!asset.is_active ? ' · Archivé' : ''}
          </p>
        </div>
        <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-xs text-subtle">
            {asset.obligation_count} obligation{asset.obligation_count > 1 ? 's' : ''}
          </p>
          {next ? (
            <p className="mt-1 truncate text-[13px] text-ink-soft">
              {next.name} · {formatCompactDate(next.next_due_date)}
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-subtle">Aucune échéance</p>
          )}
        </div>
        {next ? (
          <StatusBadge status={next.status} daysRemaining={next.days_remaining} />
        ) : null}
      </div>
    </Link>
  )
}
