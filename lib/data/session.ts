import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CURRENCY } from '@/lib/currency'
import { DEFAULT_REMINDER_DAYS } from '@/lib/reminders/rules'
import { todayInTimeZone } from '@/lib/dates'
import type { DateString, Profile } from '@/types/domain'

/**
 * Contexte de session partagé par tous les Server Components d'un rendu.
 *
 * `cache()` garantit une seule requête par requête HTTP, même si dix
 * composants demandent le profil.
 */

export interface SessionContext {
  user: User
  profile: Profile
  /** Date du jour dans le fuseau de l'utilisateur. */
  today: DateString
}

const FALLBACK_TIMEZONE = 'Africa/Algiers'

export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  // Le profil est créé par un trigger à l'inscription ; ce repli couvre un
  // compte créé avant l'application de la migration.
  const profile: Profile = data ?? {
    id: user.id,
    display_name: null,
    timezone: FALLBACK_TIMEZONE,
    default_currency: DEFAULT_CURRENCY,
    email_reminders_enabled: true,
    default_reminder_days: [...DEFAULT_REMINDER_DAYS],
    created_at: user.created_at,
    updated_at: user.created_at,
  }

  return { user, profile, today: todayInTimeZone(profile.timezone) }
})

/** À utiliser dans toute page applicative : redirige si non connecté. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext()
  if (!session) redirect('/login')
  return session
}
