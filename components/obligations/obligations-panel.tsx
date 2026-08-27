'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { setObligationArchived } from '@/actions/obligations'
import { CompleteDialog } from '@/components/obligations/complete-dialog'
import { ObligationFormDialog } from '@/components/obligations/obligation-form-dialog'
import { ObligationTable } from '@/components/obligations/obligation-table'
import { KpiRow } from '@/components/dashboard/kpi-row'
import { Button } from '@/components/ui/button'
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
import {
  ALL,
  countByHorizon,
  EMPTY_FILTERS,
  filterObligations,
  type HorizonFilter,
  type ObligationFilters,
  type ScopeFilter,
} from '@/lib/filters'
import { OBLIGATION_TYPE_LABELS, OBLIGATION_TYPES } from '@/lib/taxonomy'
import type { AssetOption } from '@/lib/data/queries'
import type { DueObligation, Obligation, ObligationType } from '@/types/domain'

/**
 * Panneau d'échéances partagé par le Dashboard et la page Échéances.
 *
 * `variant` change la densité des filtres, pas le comportement :
 *  - `dashboard` : indicateurs + filtres essentiels ;
 *  - `full`      : horizons étendus et filtres bien / catégorie / type.
 */
export function ObligationsPanel({
  rows,
  today,
  assets,
  defaultReminderDays,
  defaultCurrency,
  variant,
  title,
}: {
  rows: DueObligation[]
  today: string
  assets: AssetOption[]
  defaultReminderDays: number[]
  defaultCurrency: string
  variant: 'dashboard' | 'full'
  title: string
}) {
  const [filters, setFilters] = useState<ObligationFilters>(EMPTY_FILTERS)
  const [completing, setCompleting] = useState<DueObligation | null>(null)
  const [editing, setEditing] = useState<Obligation | null>(null)
  const [, startTransition] = useTransition()

  const counts = useMemo(() => countByHorizon(rows), [rows])
  const visible = useMemo(() => filterObligations(rows, filters), [rows, filters])

  // Seules les catégories réellement utilisées : un filtre qui ne renvoie
  // jamais rien n'a pas sa place.
  const usedCategories = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value))),
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [rows],
  )

  function update(patch: Partial<ObligationFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  function handleArchive(row: DueObligation) {
    startTransition(async () => {
      const result = await setObligationArchived(row.id, true)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Obligation archivée', {
        description: row.name,
        action: {
          label: 'Annuler',
          onClick: () => {
            void setObligationArchived(row.id, false).then((undone) => {
              if (undone.ok) toast.success('Obligation restaurée')
              else toast.error(undone.error)
            })
          },
        },
      })
    })
  }

  const horizonOptions = [
    { value: ALL, label: 'Toutes' },
    { value: 'overdue', label: 'Retard', count: counts.overdue },
    { value: '7', label: '7 jours' },
    { value: '30', label: '30 jours' },
    { value: '90', label: '90 jours' },
  ] as const

  return (
    <>
      {variant === 'dashboard' ? (
        <KpiRow
          counts={counts}
          active={filters.horizon}
          onSelect={(horizon) => update({ horizon })}
        />
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            ariaLabel="Filtrer par nature de bien"
            options={[
              { value: ALL, label: 'Tout' },
              { value: 'property', label: 'Biens' },
              { value: 'vehicle', label: 'Véhicules' },
            ]}
            value={filters.scope}
            onChange={(scope) => update({ scope: scope as ScopeFilter })}
          />

          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder="Rechercher…"
              aria-label="Rechercher une échéance"
              className="pl-8"
            />
          </div>
        </div>

        {variant === 'full' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Filtrer par échéance"
              options={horizonOptions}
              value={filters.horizon}
              onChange={(horizon) => update({ horizon: horizon as HorizonFilter })}
            />

            <Select value={filters.assetId} onValueChange={(assetId) => update({ assetId })}>
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

            <Select value={filters.category} onValueChange={(category) => update({ category })}>
              <SelectTrigger
                aria-label="Filtrer par catégorie"
                className="h-8 w-auto min-w-36 text-[13px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes catégories</SelectItem>
                {usedCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(type) => update({ type })}>
              <SelectTrigger
                aria-label="Filtrer par type"
                className="h-8 w-auto min-w-32 text-[13px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les types</SelectItem>
                {OBLIGATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {OBLIGATION_TYPE_LABELS[type as ObligationType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <section className="mt-5" aria-labelledby="obligations-heading">
        <h2 id="obligations-heading" className="mb-1 text-[13px] font-medium text-muted">
          {title}
        </h2>

        <div className="card overflow-hidden px-3 lg:px-0">
          <ObligationTable
            rows={visible}
            onComplete={setCompleting}
            onEdit={setEditing}
            onArchive={handleArchive}
            emptyState={
              rows.length === 0 ? (
                <EmptyState
                  title="Aucune échéance à venir."
                  description="Ajoute ton premier bien ou véhicule pour commencer."
                />
              ) : (
                <EmptyState
                  title="Aucun résultat."
                  description="Aucune échéance ne correspond à ces filtres."
                  action={
                    <Button size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              )
            }
          />
        </div>
      </section>

      <CompleteDialog
        obligation={completing}
        today={today}
        onOpenChange={(open) => {
          if (!open) setCompleting(null)
        }}
      />

      <ObligationFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        obligation={editing}
        assets={assets}
        defaultReminderDays={defaultReminderDays}
        defaultCurrency={defaultCurrency}
        today={today}
      />
    </>
  )
}
