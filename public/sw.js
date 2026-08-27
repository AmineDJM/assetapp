/* eslint-disable no-undef */
/**
 * Service Worker de Patrimoine.
 *
 * L'application n'a pas de serveur : les données vivent dans le navigateur et
 * les notifications sont émises par la page elle-même via
 * `registration.showNotification()`. Le rôle du worker se limite donc à ouvrir
 * la bonne page quand on clique sur une notification.
 *
 * Le gestionnaire `push` est conservé : il ne coûte rien et rendrait
 * l'application prête si un serveur d'envoi était ajouté un jour.
 *
 * Aucun cache d'application : servir une page d'échéances périmée serait pire
 * qu'un chargement réseau.
 */

self.addEventListener('install', () => {
  // Le nouveau worker remplace immédiatement l'ancien.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const DEFAULT_TITLE = 'Patrimoine'

function parsePayload(event) {
  if (!event.data) return { title: DEFAULT_TITLE, body: '', url: '/dashboard' }

  try {
    const payload = event.data.json()
    return {
      title: payload.title || DEFAULT_TITLE,
      body: payload.body || '',
      url: payload.url || '/dashboard',
      tag: payload.tag,
      obligationId: payload.obligationId,
      assetId: payload.assetId,
    }
  } catch {
    // Charge utile non-JSON : on affiche quand même quelque chose plutôt que
    // de laisser la notification silencieuse (interdit par userVisibleOnly).
    return { title: DEFAULT_TITLE, body: event.data.text(), url: '/dashboard' }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      // Deux rappels identiques se remplacent au lieu de s'empiler.
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || '/dashboard',
    self.location.origin,
  ).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Réutiliser une fenêtre déjà ouverte plutôt que d'en empiler une de plus.
        for (const client of clientList) {
          if (new URL(client.url).origin !== self.location.origin) continue
          if ('focus' in client) {
            return client.focus().then((focused) => {
              if ('navigate' in focused) return focused.navigate(targetUrl)
              return focused
            })
          }
        }
        return self.clients.openWindow(targetUrl)
      })
      .catch(() => self.clients.openWindow(targetUrl)),
  )
})
