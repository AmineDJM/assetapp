import { z } from 'zod'
import { isValidDateString } from '@/lib/dates'
import { isValidCurrencyCode } from '@/lib/currency'
import { isValidTimeZone } from '@/lib/dates'

/**
 * Schémas de validation.
 *
 * Ils sont appliqués **côté serveur**, dans les Server Actions, avant toute
 * écriture. Le formulaire réutilise les mêmes schémas pour un retour immédiat,
 * mais la validation client n'est qu'un confort : elle n'est jamais la barrière.
 */

const uuid = z.string().uuid("Identifiant invalide")

const dateString = z
  .string()
  .refine(isValidDateString, { message: 'Date invalide (format attendu : JJ/MM/AAAA)' })

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isValidCurrencyCode, { message: 'Code devise invalide (ex. EUR, DZD, USD)' })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} caractères`)
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value))

/** Un champ montant vide doit valoir `null`, pas `0`. */
const optionalAmount = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
    if (normalized === '') return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  })
  .refine((value) => value === null || !Number.isNaN(value), {
    message: 'Montant invalide',
  })
  .refine((value) => value === null || value >= 0, {
    message: 'Le montant ne peut pas être négatif',
  })

export const assetTypeSchema = z.enum(['property', 'vehicle'])

export const assetInputSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, 'Maximum 120 caractères'),
  type: assetTypeSchema,
  subtype: optionalText(60),
  country: optionalText(80),
  city: optionalText(80),
  address: optionalText(200),
  default_currency: z
    .union([currencyCode, z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value === '' || value === undefined ? null : value)),
  notes: optionalText(2000),
})

export type AssetInput = z.infer<typeof assetInputSchema>

export const obligationTypeSchema = z.enum([
  'payment',
  'declaration',
  'renewal',
  'maintenance',
  'administrative',
  'other',
])

export const calculationBasisSchema = z.enum(['scheduled', 'completion'])

export const reminderDaysSchema = z
  .array(z.number().int().min(0).max(365))
  .max(8, 'Huit rappels au maximum')

export const obligationInputSchema = z.object({
  asset_id: uuid,
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(120, 'Maximum 120 caractères'),
  type: obligationTypeSchema,
  category: optionalText(60),
  // Le cœur de la règle métier : un entier de jours, jamais zéro ni négatif.
  frequency_days: z.coerce
    .number({ message: 'Indique une fréquence en jours' })
    .int('La fréquence doit être un nombre entier de jours')
    .min(1, 'La fréquence doit être d’au moins 1 jour')
    .max(36_500, 'Fréquence trop élevée (100 ans maximum)'),
  calculation_basis: calculationBasisSchema,
  next_due_date: dateString,
  expected_amount: optionalAmount,
  currency: z
    .union([currencyCode, z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value === '' || value === undefined ? null : value)),
  reminder_days_before: reminderDaysSchema,
  notes: optionalText(2000),
})

export type ObligationInput = z.infer<typeof obligationInputSchema>

export const completionInputSchema = z.object({
  obligation_id: uuid,
  completed_date: dateString,
  actual_amount: optionalAmount,
  notes: optionalText(1000),
  /**
   * Rattrapage explicite d'un retard : n'est jamais activé automatiquement,
   * l'utilisateur doit le choisir dans le dialogue.
   */
  advance_until_future: z.boolean().default(false),
})

export type CompletionInput = z.infer<typeof completionInputSchema>

export const profileInputSchema = z.object({
  display_name: optionalText(80),
  timezone: z
    .string()
    .trim()
    .min(1, 'Le fuseau horaire est obligatoire')
    .refine(isValidTimeZone, { message: 'Fuseau horaire inconnu' }),
  default_currency: currencyCode,
  email_reminders_enabled: z.boolean(),
  default_reminder_days: reminderDaysSchema,
})

export type ProfileInput = z.infer<typeof profileInputSchema>

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.string().url('Endpoint invalide').max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  user_agent: optionalText(400),
  device_name: optionalText(80),
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>

export const idSchema = uuid
