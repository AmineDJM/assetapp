'use client'

import { useEffect } from 'react'

/**
 * Pastille sur l'icône de l'application installée : retards + échéances du
 * jour. Progressive — si le navigateur ne connaît pas la Badging API, rien ne
 * se passe et rien ne casse.
 */
export function AppBadgeSync({ count }: { count: number }) {
  useEffect(() => {
    const badging = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }

    if (typeof badging.setAppBadge !== 'function') return

    const promise =
      count > 0 ? badging.setAppBadge(count) : badging.clearAppBadge?.() ?? Promise.resolve()

    promise.catch(() => {
      // Permission refusée ou application non installée : sans conséquence.
    })
  }, [count])

  return null
}
