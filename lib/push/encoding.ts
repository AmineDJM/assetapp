/**
 * Conversion de la clé publique VAPID.
 *
 * `PushManager.subscribe` attend un `Uint8Array` alors que la clé VAPID est
 * distribuée en base64 URL-safe. Cette conversion est centralisée ici : la
 * dupliquer est la source d'erreur la plus classique d'une intégration Web Push.
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)

  // Adossé explicitement à un ArrayBuffer : `PushManager.subscribe` refuse un
  // Uint8Array potentiellement adossé à un SharedArrayBuffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

/** Extrait `p256dh` et `auth` d'une `PushSubscription` du navigateur. */
export function extractSubscriptionKeys(
  subscription: PushSubscriptionJSON,
): { p256dh: string; auth: string } | null {
  const p256dh = subscription.keys?.p256dh
  const auth = subscription.keys?.auth
  if (!p256dh || !auth) return null
  return { p256dh, auth }
}
