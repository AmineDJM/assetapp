'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { HistoryTable } from '@/components/history/history-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { differenceInDays } from '@/lib/dates'
import { ALL } from '@/lib/filters'
import { OBLIGATION_TYPE_LABELS, OBLIGATION_TYPES } from '@/lib/taxonomy'
import type { AssetOption } from '@/lib/data/queries'
import type { CompletionWithContext } from '@/types/domain'

type Period = 'all' | '30' | '90' | '365'

/** Un seul rôle : qu'est-ce qui a déjà été effectué ? */
export function HistoryView({
  rows,
  assets,
  today,
}: {
  rows: CompletionWithContext[]
  assets: AssetOption[]
  today: string
}) {
  const [period, setPeriod] = useState<Period>(ALL)
  const [assetId, setAssetId] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (assetId !== ALL && row.asset.id !== assetId) return false
      if (type !== ALL && row.obligation.type !== type) return false

      if (period !== ALL) {
        const age = differenceInDays(today, row.completed_date)
        if (age > Number(period)) return false
      }

      if (needle === '') return true
      return [row.asset.name, row.obligation.name, row.obligation.category ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [rows, assetId, type, period, search, today])

  return (
    <>
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            ariaLabel="Filtrer par période"
            options={[
              { value: ALL, label: 'Tout' },
              { value: '30', label: '30 jours' },
              { value: '90', label: '90 jours' },
              { value: '365', label: '1 an' },
            ]}
            value={period}
            onChange={(value) => setPeriod(value as Period)}
          />

          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans l’historique"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger aria-label="Filtrer par bien" className="h-8 w-auto min-w-36 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les biens</SelectItem>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Filtrer par type" className="h-8 w-auto min-w-32 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les types</SelectItem>
              {OBLIGATION_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {OBLIGATION_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="card overflow-hidden px-3 lg:px-0">
        {visible.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'Aucune validation enregistrée.' : 'Aucun résultat.'}
            description={
              rows.length === 0
                ? 'Marque une échéance comme effectuée : elle apparaîtra ici.'
                : 'Aucune validation ne correspond à ces filtres.'
            }
          />
        ) : (
          <HistoryTable rows={visible} />
        )}
      </div>
    </>
  )
}
