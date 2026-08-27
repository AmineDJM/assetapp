import { z } from 'zod'
import { isValidDateString } from '@/lib/dates'
import { isValidCurrencyCode } from '@/lib/currency'
import { isValidTimeZone } from '@/lib/dates'

/**
 * Schémas de validation.
 *
 * Appliqués avant toute écriture dans le magasin. Les données vivant dans le
 * navigateur, il n'y a qu'une barrière — celle-ci — et c'est bien elle qui
 * empêche d'enregistrer une fréquence nulle ou une date impossible.
 */

// Les identifiants sont générés localement (`crypto.randomUUID`, avec un repli
// hors contexte sécurisé) : on valide une chaîne non vide, pas un format UUID.
const identifier = z.string().min(1, 'Identifiant invalide').max(64)

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
  asset_id: identifier,
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
  obligation_id: identifier,
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
  notifications_enabled: z.boolean(),
  default_reminder_days: reminderDaysSchema,
})

export type ProfileInput = z.infer<typeof profileInputSchema>

export const idSchema = identifier
