'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Alertes in-app déjà vues.
 *
 * Stockées localement par appareil : une alerte écartée ne doit pas
 * réapparaître à chaque chargement, mais ce n'est pas une donnée qui mérite
 * un aller-retour serveur.
 *
 * `useSyncExternalStore` plutôt qu'un effet : le rendu serveur part d'un
 * ensemble vide, le client se resynchronise après hydratation, sans écart
 * entre les deux rendus.
 */
const STORAGE_KEY = 'patrimoine:dismissed-alerts'
const CHANGE_EVENT = 'patrimoine:dismissed-alerts-changed'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/** Renvoie la chaîne brute : une primitive reste stable entre deux rendus. */
function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // Navigation privée ou stockage bloqué : on se comporte comme si rien
    // n'avait été écarté.
    return ''
  }
}

function getServerSnapshot(): string {
  return ''
}

export function useDismissedAlerts(): {
  dismissed: ReadonlySet<string>
  dismiss: (keys: readonly string[]) => void
} {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const dismissed = useMemo(() => {
    if (raw === '') return new Set<string>()
    try {
      const parsed: unknown = JSON.parse(raw)
      return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
    } catch {
      return new Set<string>()
    }
  }, [raw])

  const dismiss = useCallback(
    (keys: readonly string[]) => {
      const next = new Set([...dismissed, ...keys])
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
        window.dispatchEvent(new Event(CHANGE_EVENT))
      } catch {
        // Stockage indisponible : l'alerte réapparaîtra, ce n'est pas bloquant.
      }
    },
    [dismissed],
  )

  return { dismissed, dismiss }
}
