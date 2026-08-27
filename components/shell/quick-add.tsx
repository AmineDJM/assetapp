'use client'

import { useState } from 'react'
import { Building2, Car, CalendarPlus, Plus } from 'lucide-react'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { ObligationFormDialog } from '@/components/obligations/obligation-form-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AssetOption, AssetType } from '@/types/domain'

/** Créer un bien, un véhicule ou une obligation en deux clics, depuis n'importe quel écran. */
export function QuickAdd({
  assets,
  defaultReminderDays,
  defaultCurrency,
  today,
}: {
  assets: AssetOption[]
  defaultReminderDays: number[]
  defaultCurrency: string
  today: string
}) {
  const [assetType, setAssetType] = useState<AssetType | null>(null)
  const [obligationOpen, setObligationOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="primary" size="sm">
            <Plus />
            Ajouter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setAssetType('property')}>
            <Building2 />
            Bien
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAssetType('vehicle')}>
            <Car />
            Véhicule
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setObligationOpen(true)}
            disabled={assets.length === 0}
          >
            <CalendarPlus />
            Obligation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssetFormDialog
        open={assetType !== null}
        onOpenChange={(open) => {
          if (!open) setAssetType(null)
        }}
        defaultType={assetType ?? 'property'}
      />

      <ObligationFormDialog
        open={obligationOpen}
        onOpenChange={setObligationOpen}
        assets={assets}
        defaultReminderDays={defaultReminderDays}
        defaultCurrency={defaultCurrency}
        today={today}
      />
    </>
  )
}
