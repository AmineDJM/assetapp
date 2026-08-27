'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/data/auth'
import { idSchema, pushSubscriptionInputSchema } from '@/lib/validation/schemas'
import { isPushConfigured, sendPushToUser } from '@/lib/push/server'
import { buildTestPush } from '@/lib/push/payload'
import { describeDatabaseError, fail, ok, type ActionResult } from './result'

/**
 * Gestion des abonnements push.
 *
 * Un utilisateur peut avoir autant d'abonnements que d'appareils. Chaque
 * opération est liée à l'utilisateur connecté : personne ne peut lire ni
 * supprimer l'endpoint d'un autre compte.
 */

export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const parsed = pushSubscriptionInputSchema.safeParse(input)
  if (!parsed.success) return fail('Abonnement push invalide.')

  const supabase = await createClient()

  // `endpoint` est unique : réabonner le même navigateur met à jour la ligne
  // existante au lieu d'en créer une seconde.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.user_agent,
      device_name: parsed.data.device_name,
      last_used_at: null,
    },
    { onConflict: 'endpoint' },
  )

  if (error) return fail(describeDatabaseError(error))

  revalidatePath('/settings')
  return ok()
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 1000) {
    return fail('Endpoint invalide.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', auth.userId)

  if (error) return fail(describeDatabaseError(error))

  revalidatePath('/settings')
  return ok()
}

/** Retrait d'un appareil depuis la liste des Paramètres. */
export async function deletePushDevice(subscriptionId: string): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(subscriptionId)
  if (!id.success) return fail('Identifiant d’appareil invalide.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('id', id.data)
    .eq('user_id', auth.userId)

  if (error) return fail(describeDatabaseError(error))

  revalidatePath('/settings')
  return ok()
}

/**
 * Notification de test : n'atteint que les appareils de l'utilisateur
 * connecté. Utile pour vérifier d'un coup les clés VAPID, le Service Worker,
 * la base et les permissions du navigateur.
 */
export async function sendTestPush(): Promise<ActionResult<{ sent: number; removed: number }>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  if (!isPushConfigured()) {
    return fail(
      'Les clés VAPID ne sont pas configurées sur le serveur. Voir NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT.',
    )
  }

  const supabase = await createClient()
  const result = await sendPushToUser(supabase, auth.userId, buildTestPush())

  if (result.sent === 0) {
    if (result.removed > 0) {
      revalidatePath('/settings')
      return fail(
        'L’abonnement de cet appareil avait expiré et vient d’être retiré. Réactive les notifications.',
      )
    }
    return fail('Aucun appareil abonné. Active les notifications sur cet appareil.')
  }

  revalidatePath('/settings')
  return ok({ sent: result.sent, removed: result.removed })
}
