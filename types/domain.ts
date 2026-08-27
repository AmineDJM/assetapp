/**
 * Modèle métier de l'application.
 *
 * Convention de dates : toute date *métier* (échéance, réalisation) est une
 * date pure au format ISO `YYYY-MM-DD`, jamais un instant. Les horodatages
 * système (`created_at`, `sent_at`) restent des `timestamptz`.
 */

/** Date métier au format `YYYY-MM-DD`. */
export type DateString = string

export type AssetType = 'property' | 'vehicle'

export type CalculationBasis = 'scheduled' | 'completion'

export type ObligationType =
  | 'payment'
  | 'declaration'
  | 'renewal'
  | 'maintenance'
  | 'administrative'
  | 'other'

export type DueStatus = 'overdue' | 'today' | 'soon' | 'upcoming'

export type ReminderChannel = 'email' | 'push'

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  default_currency: string
  email_reminders_enabled: boolean
  default_reminder_days: number[]
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  user_id: string
  name: string
  type: AssetType
  subtype: string | null
  country: string | null
  city: string | null
  address: string | null
  default_currency: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Obligation {
  id: string
  user_id: string
  asset_id: string
  name: string
  type: ObligationType
  category: string | null
  frequency_days: number
  calculation_basis: CalculationBasis
  next_due_date: DateString
  expected_amount: number | null
  currency: string | null
  reminder_days_before: number[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ObligationCompletion {
  id: string
  user_id: string
  obligation_id: string
  scheduled_due_date: DateString
  completed_date: DateString
  expected_amount_snapshot: number | null
  actual_amount: number | null
  currency: string | null
  notes: string | null
  created_at: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  device_name: string | null
  created_at: string
  updated_at: string
  last_used_at: string | null
}

/** Obligation enrichie de son bien et des champs calculés (jamais stockés). */
export interface ObligationWithAsset extends Obligation {
  asset: Pick<Asset, 'id' | 'name' | 'type' | 'subtype'>
}

export interface DueObligation extends ObligationWithAsset {
  days_remaining: number
  status: DueStatus
}

export interface CompletionWithContext extends ObligationCompletion {
  obligation: Pick<Obligation, 'id' | 'name' | 'type' | 'category' | 'frequency_days'>
  asset: Pick<Asset, 'id' | 'name' | 'type'>
}
