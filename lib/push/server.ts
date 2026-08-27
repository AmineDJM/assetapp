import 'server-only'

import webpush, { WebPushError } from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { PushPayload } from './payload'

/**
 * Envoi Web Push côté serveur.
 *
 * `server-only` : la clé privée VAPID ne doit jamais atteindre le navigateur.
 * Aucun service tiers, aucun abonnement payant — uniquement les push services
 * standards des navigateurs.
 */

type Client = SupabaseClient<Database>

let configured: boolean | null = null

/** Configure `web-push` une seule fois, à la demande. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    configured = false
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  } catch (error) {
    console.error('[push] Clés VAPID invalides :', error)
    configured = false
  }
  return configured
}

export function isPushConfigured(): boolean {
  return ensureConfigured()
}

export interface PushDeliveryResult {
  sent: number
  removed: number
  failed: number
}

interface SubscriptionRecord {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Envoie une notification à un abonnement.
 * `gone` signale une subscription expirée, à supprimer.
 */
async function deliver(
  subscription: SubscriptionRecord,
  payload: PushPayload,
): Promise<'sent' | 'gone' | 'failed'> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 24 * 60 * 60, urgency: 'normal' },
    )
    return 'sent'
  } catch (error) {
    // 404 / 410 : l'utilisateur a désinstallé la PWA, vidé ses données ou
    // révoqué la permission. Réessayer chaque jour ne servirait à rien.
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      return 'gone'
    }
    console.error(
      `[push] Échec d'envoi (${subscription.endpoint.slice(0, 60)}…) :`,
      error instanceof Error ? error.message : error,
    )
    return 'failed'
  }
}

export async function removeInvalidSubscription(
  client: Client,
  subscriptionId: string,
): Promise<void> {
  const { error } = await client.from('push_subscriptions').delete().eq('id', subscriptionId)
  if (error) console.error('[push] Suppression de l’abonnement expiré impossible :', error.message)
}

/**
 * Envoie une notification à **tous** les appareils d'un utilisateur.
 *
 * Un abonnement invalide n'interrompt jamais les autres : chaque appareil est
 * traité indépendamment.
 */
export async function sendPushToUser(
  client: Client,
  userId: string,
  payload: PushPayload,
): Promise<PushDeliveryResult> {
  const empty: PushDeliveryResult = { sent: 0, removed: 0, failed: 0 }
  if (!ensureConfigured()) return empty

  const { data: subscriptions, error } = await client
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('[push] Lecture des abonnements impossible :', error.message)
    return empty
  }
  if (!subscriptions || subscriptions.length === 0) return empty

  const outcomes = await Promise.all(
    subscriptions.map(async (subscription) => ({
      id: subscription.id,
      outcome: await deliver(subscription, payload),
    })),
  )

  const result = { ...empty }
  const expired: string[] = []
  const usable: string[] = []

  for (const { id, outcome } of outcomes) {
    if (outcome === 'sent') {
      result.sent += 1
      usable.push(id)
    } else if (outcome === 'gone') {
      result.removed += 1
      expired.push(id)
    } else {
      result.failed += 1
    }
  }

  if (expired.length > 0) {
    const { error: deleteError } = await client
      .from('push_subscriptions')
      .delete()
      .in('id', expired)
    if (deleteError) {
      console.error('[push] Nettoyage des abonnements expirés impossible :', deleteError.message)
    }
  }

  if (usable.length > 0) {
    await client
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', usable)
  }

  return result
}
