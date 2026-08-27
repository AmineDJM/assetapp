import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Rafraîchit la session Supabase et protège toutes les routes applicatives.
 * Le RLS reste la barrière réelle : ce proxy n'est qu'une redirection de
 * confort côté navigation.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques, le manifeste PWA, le
     * Service Worker et les icônes — qui doivent rester accessibles pour que
     * l'application soit installable et reçoive les notifications.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|api/cron/).*)',
  ],
}
