'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { setAssetArchived } from '@/actions/assets'
import { setObligationArchived } from '@/actions/obligations'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { CompleteDialog } from '@/components/obligations/complete-dialog'
import { ObligationFormDialog } from '@/components/obligations/obligation-form-dialog'
import { ObligationTable } from '@/components/obligations/obligation-table'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HistoryTable } from '@/components/history/history-table'
import { ASSET_TYPE_LABELS } from '@/lib/taxonomy'
import type { AssetOption } from '@/lib/data/queries'
import type { Asset, CompletionWithContext, DueObligation, Obligation } from '@/types/domain'

/** Un seul rôle : quelles obligations concernent ce bien ? */
export function AssetDetail({
  asset,
  obligations,
  history,
  assets,
  today,
  defaultReminderDays,
  defaultCurrency,
}: {
  asset: Asset
  obligations: DueObligation[]
  history: CompletionWithContext[]
  assets: AssetOption[]
  today: string
  defaultReminderDays: number[]
  defaultCurrency: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editingAsset, setEditingAsset] = useState(false)
  const [creatingObligation, setCreatingObligation] = useState(false)
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null)
  const [completing, setCompleting] = useState<DueObligation | null>(null)
  const [, startTransition] = useTransition()

  // Arrivée depuis une notification : /assets/<id>?obligation=<id>
  const highlightId = searchParams.get('obligation')

  useEffect(() => {
    if (!highlightId) return
    const target =
      document.getElementById(`obligation-${highlightId}`) ??
      document.getElementById(`obligation-mobile-${highlightId}`)
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightId])

  const details: Array<[string, string]> = [
    ['Type', asset.subtype ? `${ASSET_TYPE_LABELS[asset.type]} · ${asset.subtype}` : ASSET_TYPE_LABELS[asset.type]],
    ['Localisation', [asset.city, asset.country].filter(Boolean).join(', ') || '—'],
    ['Adresse', asset.address ?? '—'],
    ['Devise', asset.default_currency ?? defaultCurrency],
  ]

  function handleArchiveAsset() {
    startTransition(async () => {
      const archived = asset.is_active
      const result = await setAssetArchived(asset.id, archived)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(archived ? 'Bien archivé' : 'Bien restauré', {
        description: asset.name,
        action: {
          label: 'Annuler',
          onClick: () => {
            void setAssetArchived(asset.id, !archived).then((undone) => {
              if (!undone.ok) toast.error(undone.error)
            })
          },
        },
      })
      if (archived) router.push('/assets')
    })
  }

  function handleArchiveObligation(row: DueObligation) {
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
              if (!undone.ok) toast.error(undone.error)
            })
          },
        },
      })
    })
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{asset.name}</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {ASSET_TYPE_LABELS[asset.type]}
            {asset.is_active ? '' : ' · Archivé'}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Actions sur le bien">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEditingAsset(true)}>Modifier</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant={asset.is_active ? 'danger' : 'default'}
              onSelect={handleArchiveAsset}
            >
              {asset.is_active ? 'Archiver' : 'Restaurer'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <dl className="card grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:grid-cols-4">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 truncate text-[13px] text-ink" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="asset-obligations">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="asset-obligations" className="text-[13px] font-medium text-muted">
            Prochaines échéances
          </h2>
          <Button size="sm" onClick={() => setCreatingObligation(true)}>
            <Plus />
            Ajouter une obligation
          </Button>
        </div>

        <div className="card overflow-hidden px-3 lg:px-0">
          <ObligationTable
            rows={obligations}
            showAsset={false}
            highlightId={highlightId}
            onComplete={setCompleting}
            onEdit={setEditingObligation}
            onArchive={handleArchiveObligation}
            emptyState={
              <EmptyState
                title="Aucune échéance pour ce bien."
                description="Ajoute une obligation : assurance, électricité, entretien…"
                action={
                  <Button size="sm" variant="primary" onClick={() => setCreatingObligation(true)}>
                    <Plus />
                    Ajouter une obligation
                  </Button>
                }
              />
            }
          />
        </div>
      </section>

      {history.length > 0 ? (
        <section className="mt-8" aria-labelledby="asset-history">
          <h2 id="asset-history" className="mb-2 text-[13px] font-medium text-muted">
            Historique récent
          </h2>
          <div className="card overflow-hidden px-3 lg:px-0">
            <HistoryTable rows={history} showAsset={false} />
          </div>
        </section>
      ) : null}

      <AssetFormDialog open={editingAsset} onOpenChange={setEditingAsset} asset={asset} />

      <ObligationFormDialog
        open={creatingObligation}
        onOpenChange={setCreatingObligation}
        assets={assets}
        presetAssetId={asset.id}
        defaultReminderDays={defaultReminderDays}
        defaultCurrency={asset.default_currency ?? defaultCurrency}
        today={today}
      />

      <ObligationFormDialog
        open={editingObligation !== null}
        onOpenChange={(open) => {
          if (!open) setEditingObligation(null)
        }}
        obligation={editingObligation}
        assets={assets}
        defaultReminderDays={defaultReminderDays}
        defaultCurrency={defaultCurrency}
        today={today}
      />

      <CompleteDialog
        obligation={completing}
        today={today}
        onOpenChange={(open) => {
          if (!open) setCompleting(null)
        }}
      />
    </div>
  )
}
