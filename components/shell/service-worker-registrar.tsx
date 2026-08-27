'use client'

import { useEffect } from 'react'

/**
 * Enregistre le Service Worker.
 *
 * Il rend l'application installable et permet de recevoir les notifications
 * push quand elle est fermée. Aucune permission n'est demandée ici : la
 * demande n'a lieu que sur action explicite, dans les Paramètres.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.error('[sw] Enregistrement impossible :', error)
      })
    }

    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
