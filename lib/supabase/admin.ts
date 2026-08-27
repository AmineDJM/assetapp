import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from './env'
import type { Database } from '@/types/database'

/**
 * Client service-role : contourne le RLS.
 *
 * Réservé au cron de rappels, qui doit parcourir les obligations de tous les
 * utilisateurs. `server-only` garantit qu'une importation accidentelle depuis
 * un composant client casse la compilation.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY est manquant : le cron de rappels ne peut pas fonctionner.',
    )
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
