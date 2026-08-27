'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { createObligation, updateObligation } from '@/actions/obligations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Label } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FrequencyInput } from './frequency-input'
import { ReminderPicker } from './reminder-picker'
import { CURRENCY_OPTIONS } from '@/lib/currency'
import { formatLongDate, isValidDateString } from '@/lib/dates'
import { previewNextDueDate } from '@/lib/recurrence'
import {
  CALCULATION_BASIS_HELP,
  CALCULATION_BASIS_LABELS,
  CATEGORIES,
  OBLIGATION_TYPE_LABELS,
  OBLIGATION_TYPES,
} from '@/lib/taxonomy'
import { applyServerErrors, fieldError } from '@/lib/utils/form'
import { cn } from '@/lib/utils/cn'
import type { AssetOption } from '@/lib/data/queries'
import type { CalculationBasis, Obligation, ObligationType } from '@/types/domain'

/**
 * Deux façons de fixer la première échéance :
 *  - `known`     : l'utilisateur connaît déjà la prochaine échéance ;
 *  - `reference` : il donne une date de référence, la fréquence fait le reste.
 * L'aperçu affiche dans les deux cas la date qui sera enregistrée.
 */
type DateMode = 'known' | 'reference'

const NONE = '__none__'

interface FormValues {
  asset_id: string
  name: string
  type: ObligationType
  category: string
  date_mode: DateMode
  anchor_date: string
  frequency_days: string
  calculation_basis: CalculationBasis
  expected_amount: string
  currency: string
  reminder_days_before: number[]
  notes: string
}

function toFormValues(
  obligation: Obligation | null,
  assets: AssetOption[],
  presetAssetId: string | undefined,
  defaultReminderDays: number[],
  defaultCurrency: string,
  today: string,
): FormValues {
  if (obligation) {
    return {
      asset_id: obligation.asset_id,
      name: obligation.name,
      type: obligation.type,
      category: obligation.category ?? '',
      date_mode: 'known',
      anchor_date: obligation.next_due_date,
      frequency_days: String(obligation.frequency_days),
      calculation_basis: obligation.calculation_basis,
      expected_amount:
        obligation.expected_amount === null ? '' : String(obligation.expected_amount),
      currency: obligation.currency ?? '',
      reminder_days_before: [...obligation.reminder_days_before],
      notes: obligation.notes ?? '',
    }
  }

  const assetId = presetAssetId ?? assets[0]?.id ?? ''
  const asset = assets.find((item) => item.id === assetId)

  return {
    asset_id: assetId,
    name: '',
    type: 'payment',
    category: '',
    date_mode: 'known',
    anchor_date: today,
    frequency_days: '30',
    calculation_basis: 'scheduled',
    expected_amount: '',
    currency: asset?.default_currency ?? defaultCurrency,
    reminder_days_before: [...defaultReminderDays],
    notes: '',
  }
}

export function ObligationFormDialog({
  open,
  onOpenChange,
  assets,
  obligation = null,
  presetAssetId,
  defaultReminderDays,
  defaultCurrency,
  today,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: AssetOption[]
  obligation?: Obligation | null
  presetAssetId?: string
  defaultReminderDays: number[]
  defaultCurrency: string
  today: string
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = obligation !== null

  const initialValues = useMemo(
    () =>
      toFormValues(obligation, assets, presetAssetId, defaultReminderDays, defaultCurrency, today),
    [obligation, assets, presetAssetId, defaultReminderDays, defaultCurrency, today],
  )

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: initialValues })

  useEffect(() => {
    if (open) reset(initialValues)
  }, [open, initialValues, reset])

  // `useWatch` plutôt que `watch()` : c'est l'API réactive de react-hook-form,
  // compatible avec la mémoïsation du compilateur React.
  const dateMode = useWatch({ control, name: 'date_mode' })
  const anchorDate = useWatch({ control, name: 'anchor_date' })
  const frequencyDays = useWatch({ control, name: 'frequency_days' })
  const calculationBasis = useWatch({ control, name: 'calculation_basis' })

  // Aperçu calculé par le moteur de récurrence, jamais par le composant.
  const nextDueDate = useMemo(() => {
    const frequency = Number(frequencyDays)
    if (!isValidDateString(anchorDate)) return null
    if (dateMode === 'known') return anchorDate
    if (!Number.isInteger(frequency) || frequency < 1) return null
    return previewNextDueDate(anchorDate, frequency)
  }, [anchorDate, frequencyDays, dateMode])

  const onSubmit = handleSubmit((values) => {
    if (!nextDueDate) {
      setError('anchor_date', { type: 'client', message: 'Date invalide' })
      return
    }

    startTransition(async () => {
      const payload = {
        asset_id: values.asset_id,
        name: values.name,
        type: values.type,
        category: values.category === NONE ? '' : values.category,
        frequency_days: values.frequency_days,
        calculation_basis: values.calculation_basis,
        next_due_date: nextDueDate,
        expected_amount: values.expected_amount,
        currency: values.currency === NONE ? '' : values.currency,
        reminder_days_before: values.reminder_days_before,
        notes: values.notes,
      }

      const result = isEdit
        ? await updateObligation(obligation.id, payload)
        : await createObligation(payload)

      if (!result.ok) {
        applyServerErrors(setError, result)
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Modifications enregistrées' : 'Obligation ajoutée', {
        description: `Prochaine échéance : ${formatLongDate(result.data.next_due_date)}`,
      })
      onOpenChange(false)
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-col" noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Modifier l’obligation' : 'Ajouter une obligation'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4 pb-4">
            <Field
              id="obligation-asset"
              label="Bien / véhicule"
              error={fieldError(errors.asset_id?.message)}
            >
              <Controller
                control={control}
                name="asset_id"
                rules={{ required: 'Sélectionne un bien' }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      const asset = assets.find((item) => item.id === value)
                      if (asset?.default_currency) setValue('currency', asset.default_currency)
                    }}
                  >
                    <SelectTrigger aria-label="Bien ou véhicule">
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field id="obligation-name" label="Nom" error={fieldError(errors.name?.message)}>
              <Input
                {...register('name', { required: 'Le nom est obligatoire' })}
                placeholder="Assurance"
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="obligation-type" label="Type">
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as ObligationType)}
                    >
                      <SelectTrigger aria-label="Type d’obligation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OBLIGATION_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {OBLIGATION_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field id="obligation-category" label="Catégorie" optional>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value || NONE} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Catégorie">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <div className="space-y-3 rounded-lg border border-line bg-surface-muted/50 p-3.5">
              <Controller
                control={control}
                name="date_mode"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Point de départ">
                    {(
                      [
                        ['known', 'Prochaine échéance connue'],
                        ['reference', 'Date de référence + fréquence'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          field.value === value
                            ? 'bg-ink text-white'
                            : 'text-muted hover:bg-surface hover:text-ink',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="obligation-anchor-date"
                  label={dateMode === 'known' ? 'Prochaine échéance' : 'Date de référence'}
                  error={fieldError(errors.anchor_date?.message)}
                >
                  <Input
                    type="date"
                    className="tabular"
                    {...register('anchor_date', { required: 'La date est obligatoire' })}
                  />
                </Field>

                <div className="space-y-1.5">
                  <Label htmlFor="obligation-frequency">Fréquence en jours</Label>
                  <Controller
                    control={control}
                    name="frequency_days"
                    render={({ field }) => (
                      <FrequencyInput
                        id="obligation-frequency"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(errors.frequency_days)}
                      />
                    )}
                  />
                  {errors.frequency_days ? (
                    <p className="text-xs text-danger" role="alert">
                      {fieldError(errors.frequency_days.message)}
                    </p>
                  ) : null}
                </div>
              </div>

              <p className="text-[13px] text-ink" aria-live="polite">
                {nextDueDate ? (
                  <>
                    <span className="text-muted">Prochaine échéance : </span>
                    <span className="font-medium">{formatLongDate(nextDueDate)}</span>
                  </>
                ) : (
                  <span className="text-muted">
                    Renseigne une date et une fréquence pour voir la prochaine échéance.
                  </span>
                )}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-[13px] font-medium text-ink-soft">
                Base de calcul
              </legend>
              <Controller
                control={control}
                name="calculation_basis"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as CalculationBasis)}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <RadioCard
                      id="basis-scheduled"
                      value="scheduled"
                      title={CALCULATION_BASIS_LABELS.scheduled}
                      description={CALCULATION_BASIS_HELP.scheduled}
                    />
                    <RadioCard
                      id="basis-completion"
                      value="completion"
                      title={CALCULATION_BASIS_LABELS.completion}
                      description={CALCULATION_BASIS_HELP.completion}
                    />
                  </RadioGroup>
                )}
              />
              <p className="text-xs text-muted">
                {calculationBasis === 'scheduled'
                  ? `Après validation : échéance actuelle + ${frequencyDays || '…'} jours.`
                  : `Après validation : date de réalisation + ${frequencyDays || '…'} jours.`}
              </p>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="obligation-amount"
                label="Montant prévu"
                optional
                error={fieldError(errors.expected_amount?.message)}
              >
                <Input
                  {...register('expected_amount')}
                  inputMode="decimal"
                  placeholder="620"
                  className="tabular"
                />
              </Field>

              <Field id="obligation-currency" label="Devise" optional>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value || NONE} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Devise">
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
            </div>

            <div className="space-y-1.5">
              <Label>Rappels</Label>
              <Controller
                control={control}
                name="reminder_days_before"
                render={({ field }) => (
                  <ReminderPicker value={field.value} onChange={field.onChange} />
                )}
              />
              <p className="text-xs text-muted">
                Notification push et email (si activé) aux seuils sélectionnés.
              </p>
            </div>

            <Field id="obligation-notes" label="Notes" optional>
              <Textarea {...register('notes')} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={pending || assets.length === 0}>
              {pending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
