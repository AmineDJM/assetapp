/**
 * Types de la base Supabase.
 *
 * Écrits à la main pour rester alignés sur `supabase/migrations/`. Ils peuvent
 * être régénérés à tout moment avec :
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

import type {
  AssetType,
  CalculationBasis,
  DateString,
  ObligationType,
  ReminderChannel,
} from './domain'

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

type ProfileRow = {
  id: string
  display_name: string | null
  timezone: string
  default_currency: string
  email_reminders_enabled: boolean
  default_reminder_days: number[]
  created_at: string
  updated_at: string
}

type AssetRow = {
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

type ObligationRow = {
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

type CompletionRow = {
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

type ReminderLogRow = {
  id: string
  user_id: string
  obligation_id: string
  due_date: DateString
  days_before: number
  channel: ReminderChannel
  sent_at: string
}

type PushSubscriptionRow = {
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

type DocumentRow = {
  id: string
  user_id: string
  asset_id: string | null
  obligation_id: string | null
  file_path: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

/**
 * Aplatit une intersection en un type mappé.
 *
 * Nécessaire : supabase-js contraint chaque table à `Record<string, unknown>`,
 * et une intersection — contrairement à un type mappé — n'obtient pas
 * d'index signature implicite. Sans cela, toute la base est typée `never`.
 */
type Simplify<T> = { [K in keyof T]: T[K] }

/** Colonnes générées par la base : optionnelles à l'insertion. */
type Insert<T, Generated extends keyof T> = Simplify<
  Omit<T, Generated> & Partial<Pick<T, Generated>>
>
type Update<T> = Simplify<Partial<T>>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Insert<ProfileRow, 'created_at' | 'updated_at' | 'timezone' | 'default_currency' | 'email_reminders_enabled' | 'default_reminder_days' | 'display_name'>
        Update: Update<ProfileRow>
        Relationships: []
      }
      assets: {
        Row: AssetRow
        Insert: Insert<AssetRow, 'id' | 'created_at' | 'updated_at' | 'is_active'>
        Update: Update<AssetRow>
        Relationships: []
      }
      obligations: {
        Row: ObligationRow
        Insert: Insert<ObligationRow, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'reminder_days_before' | 'calculation_basis'>
        Update: Update<ObligationRow>
        Relationships: []
      }
      obligation_completions: {
        Row: CompletionRow
        Insert: Insert<CompletionRow, 'id' | 'created_at'>
        Update: Update<CompletionRow>
        Relationships: []
      }
      reminder_logs: {
        Row: ReminderLogRow
        Insert: Insert<ReminderLogRow, 'id' | 'sent_at'>
        Update: Update<ReminderLogRow>
        Relationships: []
      }
      push_subscriptions: {
        Row: PushSubscriptionRow
        Insert: Insert<PushSubscriptionRow, 'id' | 'created_at' | 'updated_at' | 'last_used_at'>
        Update: Update<PushSubscriptionRow>
        Relationships: []
      }
      documents: {
        Row: DocumentRow
        Insert: Insert<DocumentRow, 'id' | 'created_at'>
        Update: Update<DocumentRow>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      mark_obligation_complete: {
        Args: {
          p_obligation_id: string
          p_completed_date: string
          p_next_due_date: string
          p_actual_amount?: number | null
          p_notes?: string | null
        }
        Returns: {
          completion_id: string
          previous_due_date: DateString
          next_due_date: DateString
        }[]
      }
      undo_obligation_completion: {
        Args: { p_completion_id: string }
        Returns: { obligation_id: string; restored_due_date: DateString }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
