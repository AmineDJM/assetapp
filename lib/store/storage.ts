import { createEmptyData, migrate, type PatrimoineData } from './schema'

/**
 * Persistance dans `localStorage`.
 *
 * Chaque écriture est protégée : navigation privée, quota dépassé ou stockage
 * bloqué ne doivent jamais faire planter l'application — au pire les données
 * ne survivent pas à la session, et l'interface le signale.
 */

export const STORAGE_KEY = 'patrimoine:data:v1'
export const CHANGE_EVENT = 'patrimoine:data-changed'

export type WriteResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' }

/**
 * Sondé une seule fois puis mémorisé : `useSyncExternalStore` exige un
 * instantané stable, et écrire à chaque rendu pour tester serait absurde.
 */
let availability: boolean | null = null

export function isStorageAvailable(): boolean {
  if (availability !== null) return availability
  try {
    const probe = '__patrimoine_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    availability = true
  } catch {
    availability = false
  }
  return availability
}

export function readData(): PatrimoineData {
  if (typeof window === 'undefined') return createEmptyData()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyData()
    return migrate(JSON.parse(raw))
  } catch {
    // Document illisible : on repart d'un état vide plutôt que de bloquer
    // l'application sur une erreur de parsing.
    console.error('[store] Données illisibles, réinitialisation de la session.')
    return createEmptyData()
  }
}

export function writeData(data: PatrimoineData): WriteResult {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Prévient les autres onglets ouverts ainsi que le nôtre.
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return { ok: true }
  } catch (error) {
    // L'écriture a échoué : le stockage n'est pas exploitable, l'interface
    // doit le dire. On notifie pour que les abonnés relisent l'état.
    availability = false
    try {
      window.dispatchEvent(new Event(CHANGE_EVENT))
    } catch {
      // Environnement sans window : rien à notifier.
    }

    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    return { ok: false, reason: quota ? 'quota' : 'unavailable' }
  }
}

/** Horloge : sert d'« système externe » pour faire basculer la date à minuit. */
export function subscribeToClock(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 60_000)
  return () => window.clearInterval(timer)
}

/** Numéro de minute courant : primitive stable entre deux rendus. */
export function getMinuteSnapshot(): number {
  return Math.floor(Date.now() / 60_000)
}

/** Chaîne brute : sert de « snapshot » stable à `useSyncExternalStore`. */
export function readRaw(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
