'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import type { Database } from '@/types/database'

/** Client navigateur. N'utilise que la clé publique, protégée par le RLS. */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
}
