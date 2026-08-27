import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/config'
import { runReminders } from '@/lib/reminders/run'

/**
 * Rappels quotidiens — déclenché par Vercel Cron (voir `vercel.json`).
 *
 * Un seul passage par jour, compatible avec le plan Vercel Hobby. La route est
 * protégée par `CRON_SECRET` : Vercel l'envoie en `Authorization: Bearer …`.
 * Sans secret configuré, la route refuse de s'exécuter plutôt que de rester
 * ouverte.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** Comparaison à temps constant : ne révèle pas le secret par le timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  return safeEqual(bearer, secret)
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET n’est pas configuré : le cron de rappels est désactivé.' },
      { status: 503 },
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Variables Supabase manquantes : le cron ne peut pas s’exécuter.' },
      { status: 503 },
    )
  }

  try {
    const summary = await runReminders(createAdminClient())
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[cron:reminders]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
