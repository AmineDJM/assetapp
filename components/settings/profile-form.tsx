'use client'

import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { editProfile } from '@/lib/store/mutations'
import { useStore } from '@/lib/store/provider'
import { profileInputSchema } from '@/lib/validation/schemas'
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
import { fieldError, validateForm } from '@/lib/utils/form'
import type { Profile } from '@/types/domain'

interface FormValues {
  display_name: string
  timezone: string
  default_currency: string
  notifications_enabled: boolean
  default_reminder_days: number[]
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const { update } = useStore()

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
      notifications_enabled: profile.notifications_enabled,
      default_reminder_days: [...profile.default_reminder_days],
    },
  })

  const onSubmit = handleSubmit((values) => {
    const parsed = validateForm(profileInputSchema, values, setError)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }

    update((current) => editProfile(current, parsed.value))
    toast.success('Modifications enregistrées')
    reset(values)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Nom" optional error={fieldError(errors.display_name?.message)}>
          <Input {...register('display_name')} placeholder="Amine" autoComplete="name" />
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
          name="notifications_enabled"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-label="Notification système à l’ouverture"
              />
              <span className="text-[13px] text-ink">
                Notification système à l’ouverture de l’application
              </span>
            </label>
          )}
        />
        <p className="text-xs leading-relaxed text-muted">
          Affiche une vraie notification de l’appareil pour les échéances qui arrivent, au
          moment où tu ouvres Patrimoine. Elle reste ensuite dans ton centre de notifications.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!isDirty}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
