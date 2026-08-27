'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Car } from 'lucide-react'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { Button } from '@/components/ui/button'
import type { AssetType } from '@/types/domain'

/** Première connexion : une seule chose à faire, deux façons de la faire. */
export function WelcomeEmptyState() {
  const [assetType, setAssetType] = useState<AssetType | null>(null)

  return (
    <>
      <div className="card px-6 py-14 text-center">
        <p className="text-sm font-medium text-ink">Bienvenue.</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
          Commence par ajouter ton premier bien ou véhicule. Tu pourras ensuite y attacher des
          échéances récurrentes. Tout reste sur cet appareil.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="primary" onClick={() => setAssetType('property')}>
            <Building2 />
            Ajouter un bien
          </Button>
          <Button onClick={() => setAssetType('vehicle')}>
            <Car />
            Ajouter un véhicule
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Ou{' '}
          <Link href="/settings" className="underline underline-offset-2 hover:text-ink">
            charge des données d’exemple
          </Link>{' '}
          pour explorer.
        </p>
      </div>

      <AssetFormDialog
        open={assetType !== null}
        onOpenChange={(open) => {
          if (!open) setAssetType(null)
        }}
        defaultType={assetType ?? 'property'}
      />
    </>
  )
}
