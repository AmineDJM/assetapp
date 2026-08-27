'use client'

import * as React from 'react'
import { todayInTimeZone } from '@/lib/dates'
import { createEmptyData, migrate, type PatrimoineData } from './schema'
import {
  getMinuteSnapshot,
  isStorageAvailable,
  readRaw,
  subscribe,
  subscribeToClock,
  writeData,
} from './storage'
import type { DateString } from '@/types/domain'

/**
 * Accès au document depuis React.
 *
 * `useSyncExternalStore` s'abonne au `localStorage` : deux onglets ouverts
 * restent synchronisés, et le rendu serveur part d'un document vide sans écart
 * d'hydratation. Le « snapshot » est la chaîne brute — une primitive stable —
 * et le document n'est reconstruit que lorsqu'elle change.
 */

interface StoreContextValue {
  data: PatrimoineData
  /** `false` tant que le navigateur n'a pas pris le relais du rendu serveur. */
  hydrated: boolean
  /** Date du jour dans le fuseau du profil. */
  today: DateString
  storageAvailable: boolean
  update: (recipe: (current: PatrimoineData) => PatrimoineData) => void
  replaceAll: (next: PatrimoineData) => void
}

const StoreContext = React.createContext<StoreContextValue | null>(null)

const EMPTY_RAW = ''

/**
 * Date affichée avant hydratation. Les écrans attendent `hydrated` pour rendre
 * quoi que ce soit : cette valeur n'est jamais visible, elle garantit
 * seulement que les calculs de dates reçoivent une entrée valide.
 */
const PLACEHOLDER_DATE = '1970-01-01'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const raw = React.useSyncExternalStore(subscribe, readRaw, () => EMPTY_RAW)
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  const data = React.useMemo<PatrimoineData>(() => {
    if (raw === EMPTY_RAW) return createEmptyData()
    try {
      return migrate(JSON.parse(raw))
    } catch {
      return createEmptyData()
    }
  }, [raw])

  // Le stockage et l'horloge sont des systèmes externes : on s'y abonne au
  // lieu de les recopier dans un état React.
  const storageAvailable = React.useSyncExternalStore(
    subscribe,
    isStorageAvailable,
    () => true,
  )

  // Rafraîchi chaque minute : la date bascule à minuit sans recharger la page.
  const minute = React.useSyncExternalStore(subscribeToClock, getMinuteSnapshot, () => 0)

  const today = React.useMemo(
    () =>
      hydrated
        ? todayInTimeZone(data.profile.timezone, new Date(minute * 60_000))
        : PLACEHOLDER_DATE,
    [data.profile.timezone, minute, hydrated],
  )

  const replaceAll = React.useCallback((next: PatrimoineData) => {
    writeData(next)
  }, [])

  const update = React.useCallback(
    (recipe: (current: PatrimoineData) => PatrimoineData) => {
      // Relu juste avant l'écriture : un autre onglet a pu modifier le document.
      const current = raw === EMPTY_RAW ? createEmptyData() : safeParse(raw)
      replaceAll(recipe(current))
    },
    [raw, replaceAll],
  )

  const value = React.useMemo<StoreContextValue>(
    () => ({ data, hydrated, today, storageAvailable, update, replaceAll }),
    [data, hydrated, today, storageAvailable, update, replaceAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function safeParse(raw: string): PatrimoineData {
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return createEmptyData()
  }
}

export function useStore(): StoreContextValue {
  const value = React.useContext(StoreContext)
  if (!value) throw new Error('useStore doit être utilisé à l’intérieur de StoreProvider')
  return value
}
