'use client'

import { useCallback, useEffect, useState } from 'react'
import { deletePushSubscription, savePushSubscription } from '@/actions/push'
import { describeDevice } from '@/lib/push/device'
import { extractSubscriptionKeys, urlBase64ToUint8Array } from '@/lib/push/encoding'

/**
 * Abonnement Web Push de cet appareil.
 *
 * La permission n'est jamais demandée au chargement : uniquement dans
 * `enable()`, déclenché par un clic. Un navigateur sollicité automatiquement
 * bloque durablement le site.
 */

export type PushState =
  | 'loading'
  /** Ni Service Worker ni Push API : rien à proposer. */
  | 'unsupported'
  /** iOS : l'application doit d'abord être ajoutée à l'écran d'accueil. */
  | 'needs-install'
  /** Clés VAPID absentes côté serveur. */
  | 'not-configured'
  | 'denied'
  | 'inactive'
  | 'active'

interface UsePushNotifications {
  state: PushState
  busy: boolean
  error: string | null
  enable: () => Promise<void>
  disable: () => Promise<void>
}

function isStandaloneDisplay(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // Propriété propre à Safari iOS ; sa seule présence identifie la plateforme
  // sans analyser le user-agent.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function usePushNotifications(vapidPublicKey: string | null): UsePushNotifications {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function detect() {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

      if (!supported) {
        // Sur iOS, Push API n'existe que dans une application installée.
        const iosSafari = 'standalone' in navigator
        if (!cancelled) {
          setState(iosSafari && !isStandaloneDisplay() ? 'needs-install' : 'unsupported')
        }
        return
      }

      if (!vapidPublicKey) {
        if (!cancelled) setState('not-configured')
        return
      }

      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied')
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!cancelled) setState(subscription ? 'active' : 'inactive')
      } catch {
        if (!cancelled) setState('inactive')
      }
    }

    void detect()
    return () => {
      cancelled = true
    }
  }, [vapidPublicKey])

  const enable = useCallback(async () => {
    if (!vapidPublicKey) return
    setBusy(true)
    setError(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'inactive')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }))

      const json = subscription.toJSON()
      const keys = extractSubscriptionKeys(json)
      if (!json.endpoint || !keys) {
        setError('Abonnement incomplet renvoyé par le navigateur.')
        return
      }

      const result = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent.slice(0, 400),
        device_name: describeDevice(navigator.userAgent),
      })

      if (!result.ok) {
        // L'abonnement navigateur ne doit pas survivre à un échec
        // d'enregistrement : il ne recevrait jamais rien.
        await subscription.unsubscribe().catch(() => undefined)
        setError(result.error)
        return
      }

      setState('active')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Activation impossible : ${cause.message}`
          : 'Activation impossible.',
      )
    } finally {
      setBusy(false)
    }
  }, [vapidPublicKey])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        const result = await deletePushSubscription(endpoint)
        if (!result.ok) setError(result.error)
      }

      setState('inactive')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Désactivation impossible : ${cause.message}`
          : 'Désactivation impossible.',
      )
    } finally {
      setBusy(false)
    }
  }, [])

  return { state, busy, error, enable, disable }
}
