'use client'

import { useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateProfile } from '@/actions/settings'
import { ReminderPicker } from '@/components/obligations/reminder-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, Label } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCY_OPTIONS } from '@/lib/currency'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'
import { applyServerErrors, fieldError } from '@/lib/utils/form'
import type { Profile } from '@/types/domain'

interface FormValues {
  display_name: string
  timezone: string
  default_currency: string
  email_reminders_enabled: boolean
  default_reminder_days: number[]
}

export function ProfileForm({
  profile,
  email,
  emailConfigured,
}: {
  profile: Profile
  email: string
  emailConfigured: boolean
}) {
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      display_name: profile.display_name ?? '',
      timezone: profile.timezone,
      default_currency: profile.default_currency,
      email_reminders_enabled: profile.email_reminders_enabled,
      default_reminder_days: [...profile.default_reminder_days],
    },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateProfile(values)
      if (!result.ok) {
        applyServerErrors(setError, result)
        toast.error(result.error)
        return
      }
      toast.success('Modifications enregistrées')
      reset(values)
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Nom" optional error={fieldError(errors.display_name?.message)}>
          <Input {...register('display_name')} placeholder="Amine" autoComplete="name" />
        </Field>

        <Field id="profile-email" label="Email">
          <Input value={email} readOnly disabled aria-label="Adresse email du compte" />
        </Field>

        <Field
          id="profile-timezone"
          label="Fuseau horaire"
          hint="Détermine ce que « aujourd’hui » signifie pour tes échéances."
          error={fieldError(errors.timezone?.message)}
        >
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Fuseau horaire">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field id="profile-currency" label="Devise par défaut">
          <Controller
            control={control}
            name="default_currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Devise par défaut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
        <Label>Rappels par défaut</Label>
        <Controller
          control={control}
          name="default_reminder_days"
          render={({ field }) => (
            <ReminderPicker
              idPrefix="profile-reminder"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-xs text-muted">
          Préremplit les rappels des nouvelles obligations. Les obligations existantes gardent
          leur propre configuration.
        </p>
      </div>

      <div className="space-y-1.5">
        <Controller
          control={control}
          name="email_reminders_enabled"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-label="Rappels par email"
              />
              <span className="text-[13px] text-ink">Rappels par email</span>
            </label>
          )}
        />
        {!emailConfigured ? (
          <p className="text-xs text-muted">
            Aucun fournisseur email n’est configuré sur ce déploiement (RESEND_API_KEY absente) :
            les rappels email sont ignorés. Les notifications push et in-app fonctionnent
            normalement.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={pending || !isDirty}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
