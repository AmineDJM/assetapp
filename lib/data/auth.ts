import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Vérification d'authentification côté serveur, partagée par les Server
 * Actions. `getUser()` revalide le jeton auprès de Supabase — contrairement à
 * `getSession()`, qui se contente de lire un cookie potentiellement forgé.
 */
export type AuthCheck = { ok: true; userId: string } | { ok: false; error: string }

export async function requireUserId(): Promise<AuthCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Session expirée. Reconnecte-toi.' }
  return { ok: true, userId: user.id }
}
