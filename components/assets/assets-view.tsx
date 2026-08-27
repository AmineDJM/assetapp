'use client'

import { useMemo, useState } from 'react'
import { Building2, Car, Plus, Search } from 'lucide-react'
import { AssetCard } from '@/components/assets/asset-card'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { ALL, type ScopeFilter } from '@/lib/filters'
import type { AssetType, AssetWithSummary } from '@/types/domain'

/** Un seul rôle : qu'est-ce que je possède ou gère ? */
export function AssetsView({ assets }: { assets: AssetWithSummary[] }) {
  const [scope, setScope] = useState<ScopeFilter>(ALL)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState<AssetType | null>(null)

  const counts = useMemo(
    () => ({
      property: assets.filter((asset) => asset.type === 'property').length,
      vehicle: assets.filter((asset) => asset.type === 'vehicle').length,
    }),
    [assets],
  )

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return assets.filter((asset) => {
      if (scope !== ALL && asset.type !== scope) return false
      if (needle === '') return true
      return [asset.name, asset.city ?? '', asset.country ?? '', asset.subtype ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [assets, scope, search])

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Filtrer les biens"
          options={[
            { value: ALL, label: 'Tout', count: assets.length },
            { value: 'property', label: 'Biens', count: counts.property },
            { value: 'vehicle', label: 'Véhicules', count: counts.vehicle },
          ]}
          value={scope}
          onChange={(value) => setScope(value as ScopeFilter)}
        />

        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher un bien"
            className="pl-8"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            title={assets.length === 0 ? 'Aucun bien pour le moment.' : 'Aucun résultat.'}
            description={
              assets.length === 0
                ? 'Ajoute ton premier bien ou véhicule pour commencer.'
                : 'Aucun bien ne correspond à cette recherche.'
            }
            action={
              assets.length === 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="primary" onClick={() => setCreating('property')}>
                    <Building2 />
                    Ajouter un bien
                  </Button>
                  <Button onClick={() => setCreating('vehicle')}>
                    <Car />
                    Ajouter un véhicule
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}

          <button
            type="button"
            onClick={() => setCreating(scope === 'vehicle' ? 'vehicle' : 'property')}
            className="flex min-h-28 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong text-[13px] font-medium text-muted transition-colors hover:border-subtle hover:text-ink"
          >
            <Plus className="size-4" />
            Ajouter un bien
          </button>
        </div>
      )}

      <AssetFormDialog
        open={creating !== null}
        onOpenChange={(open) => {
          if (!open) setCreating(null)
        }}
        defaultType={creating ?? 'property'}
      />
    </>
  )
}
