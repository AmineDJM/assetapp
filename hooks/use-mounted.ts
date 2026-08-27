'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * `false` au rendu serveur et au premier rendu client, `true` ensuite.
 * Permet de lire une API navigateur sans écart d'hydratation.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
