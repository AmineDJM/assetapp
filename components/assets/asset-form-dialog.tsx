'use client'

import { useEffect, useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { createAsset, updateAsset } from '@/actions/assets'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ASSET_TYPE_LABELS, subtypesFor } from '@/lib/taxonomy'
import { CURRENCY_OPTIONS } from '@/lib/currency'
import { applyServerErrors, fieldError } from '@/lib/utils/form'
import type { Asset, AssetType } from '@/types/domain'

interface FormValues {
  name: string
  type: AssetType
  subtype: string
  country: string
  city: string
  address: string
  default_currency: string
  notes: string
}

const NONE = '__none__'

function toFormValues(asset: Asset | null, defaultType: AssetType): FormValues {
  return {
    name: asset?.name ?? '',
    type: asset?.type ?? defaultType,
    subtype: asset?.subtype ?? '',
    country: asset?.country ?? '',
    city: asset?.city ?? '',
    address: asset?.address ?? '',
    default_currency: asset?.default_currency ?? '',
    notes: asset?.notes ?? '',
  }
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset = null,
  defaultType = 'property',
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset?: Asset | null
  defaultType?: AssetType
  onSaved?: (asset: Asset) => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = asset !== null

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: toFormValues(asset, defaultType) })

  // Réinitialise à chaque ouverture : un dialogue rouvert ne doit jamais
  // afficher la saisie précédente.
  useEffect(() => {
    if (open) reset(toFormValues(asset, defaultType))
  }, [open, asset, defaultType, reset])

  // `useWatch` plutôt que `watch()` : c'est l'API réactive de react-hook-form,
  // compatible avec la mémoïsation du compilateur React.
  const type = useWatch({ control, name: 'type' })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const payload = {
        ...values,
        subtype: values.subtype === NONE ? '' : values.subtype,
        default_currency: values.default_currency === NONE ? '' : values.default_currency,
      }
      const result = isEdit ? await updateAsset(asset.id, payload) : await createAsset(payload)

      if (!result.ok) {
        applyServerErrors(setError, result)
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Modifications enregistrées' : 'Bien ajouté')
      onOpenChange(false)
      onSaved?.(result.data)
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? 'Modifier le bien'
                : defaultType === 'vehicle'
                  ? 'Ajouter un véhicule'
                  : 'Ajouter un bien'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4 pb-4">
            <Field id="asset-name" label="Nom" error={fieldError(errors.name?.message)}>
              <Input
                {...register('name', { required: 'Le nom est obligatoire' })}
                placeholder="Appartement Milan"
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="asset-type" label="Type">
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as AssetType)}
                    >
                      <SelectTrigger aria-label="Type de bien">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((value) => (
                          <SelectItem key={value} value={value}>
                            {ASSET_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field id="asset-subtype" label="Sous-type" optional>
                <Controller
                  control={control}
                  name="subtype"
                  render={({ field }) => (
                    <Select value={field.value || NONE} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Sous-type">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {subtypesFor(type).map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field id="asset-country" label="Pays" optional>
                <Input {...register('country')} placeholder="Italie" />
              </Field>

              <Field id="asset-city" label="Ville" optional>
                <Input {...register('city')} placeholder="Milan" />
              </Field>
            </div>

            <Field id="asset-address" label="Adresse" optional>
              <Input {...register('address')} />
            </Field>

            <Field
              id="asset-currency"
              label="Devise par défaut"
              optional
              hint="Préremplit la devise des obligations de ce bien."
            >
              <Controller
                control={control}
                name="default_currency"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Devise par défaut">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field id="asset-notes" label="Notes" optional>
              <Textarea {...register('notes')} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
