'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteAsset, setAssetArchived } from '@/actions/assets'
import { deleteObligation, setObligationArchived } from '@/actions/obligations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ASSET_TYPE_LABELS } from '@/lib/taxonomy'
import type { Asset, Obligation } from '@/types/domain'

/**
 * Éléments archivés : restaurables en un clic.
 *
 * La suppression définitive — la seule action réellement irréversible de
 * l'application — passe par une confirmation explicite.
 */
type Target =
  | { kind: 'asset'; id: string; name: string }
  | { kind: 'obligation'; id: string; name: string }

export function ArchivedList({
  assets,
  obligations,
}: {
  assets: Asset[]
  obligations: Array<Obligation & { assetName: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<Target | null>(null)

  if (assets.length === 0 && obligations.length === 0) {
    return <p className="text-[13px] text-muted">Aucun élément archivé.</p>
  }

  function restore(target: Target) {
    startTransition(async () => {
      const result =
        target.kind === 'asset'
          ? await setAssetArchived(target.id, false)
          : await setObligationArchived(target.id, false)

      if (!result.ok) toast.error(result.error)
      else toast.success('Élément restauré', { description: target.name })
    })
  }

  function confirmDelete() {
    if (!confirming) return
    const target = confirming

    startTransition(async () => {
      const result =
        target.kind === 'asset'
          ? await deleteAsset(target.id)
          : await deleteObligation(target.id)

      if (!result.ok) toast.error(result.error)
      else toast.success('Supprimé définitivement', { description: target.name })
      setConfirming(null)
    })
  }

  return (
    <>
      <ul className="divide-y divide-line border-t border-line">
        {assets.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-ink">{asset.name}</p>
              <p className="text-xs text-subtle">{ASSET_TYPE_LABELS[asset.type]}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => restore({ kind: 'asset', id: asset.id, name: asset.name })}
              >
                Restaurer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={() => setConfirming({ kind: 'asset', id: asset.id, name: asset.name })}
              >
                Supprimer
              </Button>
            </div>
          </li>
        ))}

        {obligations.map((obligation) => (
          <li key={obligation.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-ink">{obligation.name}</p>
              <p className="truncate text-xs text-subtle">{obligation.assetName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  restore({ kind: 'obligation', id: obligation.id, name: obligation.name })
                }
              >
                Restaurer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={() =>
                  setConfirming({ kind: 'obligation', id: obligation.id, name: obligation.name })
                }
              >
                Supprimer
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer définitivement</DialogTitle>
            <DialogDescription>
              {confirming?.name} sera supprimé, ainsi que son historique.
              {confirming?.kind === 'asset'
                ? ' Toutes ses obligations disparaîtront également.'
                : ''}{' '}
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={pending}>
              {pending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
