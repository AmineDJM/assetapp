import { DEFAULT_CURRENCY } from '@/lib/currency'
import { DEFAULT_REMINDER_DAYS } from '@/lib/reminders/rules'
import type {
  Asset,
  Obligation,
  ObligationCompletion,
  Profile,
} from '@/types/domain'

/**
 * Forme des données persistées.
 *
 * Tout tient dans un seul document JSON : quelques dizaines de biens et
 * d'obligations, quelques centaines de validations après des années — de
 * l'ordre de la centaine de kilo-octets. Aucun serveur, aucune base.
 *
 * `version` permet de faire évoluer la structure sans perdre les données
 * existantes : `migrate()` transforme un document ancien en document courant.
 */

export const CURRENT_VERSION = 1

export interface PatrimoineData {
  version: number
  profile: Profile
  assets: Asset[]
  obligations: Obligation[]
  completions: ObligationCompletion[]
}

/** Fuseau du navigateur : « aujourd'hui » doit être celui que vit l'utilisateur. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function createEmptyData(): PatrimoineData {
  return {
    version: CURRENT_VERSION,
    profile: {
      display_name: null,
      timezone: detectTimezone(),
      default_currency: DEFAULT_CURRENCY,
      default_reminder_days: [...DEFAULT_REMINDER_DAYS],
      notifications_enabled: false,
    },
    assets: [],
    obligations: [],
    completions: [],
  }
}

/**
 * Normalise un document lu depuis le stockage ou importé d'une sauvegarde.
 *
 * Volontairement tolérant : un document tronqué ou partiellement corrompu doit
 * rendre ce qui est encore lisible plutôt que de tout perdre.
 */
export function migrate(raw: unknown): PatrimoineData {
  const empty = createEmptyData()
  if (typeof raw !== 'object' || raw === null) return empty

  const source = raw as Partial<PatrimoineData>

  return {
    version: CURRENT_VERSION,
    profile: { ...empty.profile, ...(source.profile ?? {}) },
    assets: Array.isArray(source.assets) ? source.assets.filter(isAsset) : [],
    obligations: Array.isArray(source.obligations)
      ? source.obligations.filter(isObligation)
      : [],
    completions: Array.isArray(source.completions)
      ? source.completions.filter(isCompletion)
      : [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAsset(value: unknown): value is Asset {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isObligation(value: unknown): value is Obligation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.asset_id === 'string' &&
    typeof value.next_due_date === 'string' &&
    typeof value.frequency_days === 'number'
  )
}

function isCompletion(value: unknown): value is ObligationCompletion {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.obligation_id === 'string' &&
    typeof value.completed_date === 'string'
  )
}
