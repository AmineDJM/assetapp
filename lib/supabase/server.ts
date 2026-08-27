import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import type { Database } from '@/types/database'

/**
 * Client serveur lié à la session de l'utilisateur (Server Components, Server
 * Actions, Route Handlers). Toutes les requêtes passent par le RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Appelé depuis un Server Component : le middleware rafraîchit déjà
          // la session, il n'y a rien à faire ici.
        }
      },
    },
  })
}
