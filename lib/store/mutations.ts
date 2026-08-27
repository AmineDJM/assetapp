import { advanceUntilFutureDate, calculateNextDueDate } from '@/lib/recurrence'
import { normalizeReminderDays } from '@/lib/reminders/rules'
import type {
  AssetInput,
  CompletionInput,
  ObligationInput,
  ProfileInput,
} from '@/lib/validation/schemas'
import type { DateString, PatrimoineData } from './types'

/**
 * Opérations métier sur le document.
 *
 * Fonctions **pures** : elles reçoivent l'état et rendent un nouvel état,
 * sans toucher au stockage ni à React. C'est ce qui les rend directement
 * testables, et c'est ici que vivent les règles — jamais dans un composant.
 */

function stamp(): string {
  return new Date().toISOString()
}

function newId(): string {
  // `randomUUID` exige un contexte sécurisé ; le repli couvre http://.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------------------------------------------------------------------------
// Biens
// ---------------------------------------------------------------------------

export function addAsset(data: PatrimoineData, input: AssetInput): PatrimoineData {
  const now = stamp()
  return {
    ...data,
    assets: [
      ...data.assets,
      { id: newId(), ...input, is_active: true, created_at: now, updated_at: now },
    ],
  }
}

export function editAsset(
  data: PatrimoineData,
  assetId: string,
  input: AssetInput,
): PatrimoineData {
  return {
    ...data,
    assets: data.assets.map((asset) =>
      asset.id === assetId ? { ...asset, ...input, updated_at: stamp() } : asset,
    ),
  }
}

/**
 * Archiver un bien archive aussi ses obligations : sans cela, le dashboard
 * afficherait des échéances orphelines.
 */
export function setAssetArchived(
  data: PatrimoineData,
  assetId: string,
  archived: boolean,
): PatrimoineData {
  const now = stamp()
  return {
    ...data,
    assets: data.assets.map((asset) =>
      asset.id === assetId ? { ...asset, is_active: !archived, updated_at: now } : asset,
    ),
    obligations: data.obligations.map((obligation) =>
      obligation.asset_id === assetId
        ? { ...obligation, is_active: !archived, updated_at: now }
        : obligation,
    ),
  }
}

/** Suppression définitive : le bien, ses obligations et leur historique. */
export function removeAsset(data: PatrimoineData, assetId: string): PatrimoineData {
  const obligationIds = new Set(
    data.obligations.filter((o) => o.asset_id === assetId).map((o) => o.id),
  )
  return {
    ...data,
    assets: data.assets.filter((asset) => asset.id !== assetId),
    obligations: data.obligations.filter((obligation) => obligation.asset_id !== assetId),
    completions: data.completions.filter(
      (completion) => !obligationIds.has(completion.obligation_id),
    ),
  }
}

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

export function addObligation(
  data: PatrimoineData,
  input: ObligationInput,
): PatrimoineData {
  const now = stamp()
  return {
    ...data,
    obligations: [
      ...data.obligations,
      {
        id: newId(),
        ...input,
        reminder_days_before: normalizeReminderDays(input.reminder_days_before),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
  }
}

/**
 * Modifier une obligation n'affecte que les échéances à venir : les lignes
 * d'historique restent telles qu'elles ont été enregistrées.
 */
export function editObligation(
  data: PatrimoineData,
  obligationId: string,
  input: ObligationInput,
): PatrimoineData {
  return {
    ...data,
    obligations: data.obligations.map((obligation) =>
      obligation.id === obligationId
        ? {
            ...obligation,
            ...input,
            reminder_days_before: normalizeReminderDays(input.reminder_days_before),
            updated_at: stamp(),
          }
        : obligation,
    ),
  }
}

export function setObligationArchived(
  data: PatrimoineData,
  obligationId: string,
  archived: boolean,
): PatrimoineData {
  return {
    ...data,
    obligations: data.obligations.map((obligation) =>
      obligation.id === obligationId
        ? { ...obligation, is_active: !archived, updated_at: stamp() }
        : obligation,
    ),
  }
}

export function removeObligation(
  data: PatrimoineData,
  obligationId: string,
): PatrimoineData {
  return {
    ...data,
    obligations: data.obligations.filter((obligation) => obligation.id !== obligationId),
    completions: data.completions.filter(
      (completion) => completion.obligation_id !== obligationId,
    ),
  }
}

// ---------------------------------------------------------------------------
// Validation d'une échéance
// ---------------------------------------------------------------------------

export interface CompletionOutcome {
  data: PatrimoineData
  completionId: string
  obligationName: string
  previousDueDate: DateString
  nextDueDate: DateString
}

/**
 * « Marquer comme effectué ».
 *
 * Écrit l'historique et recalcule l'échéance en une seule transformation :
 * il est structurellement impossible d'obtenir un historique sans échéance
 * recalculée. Le montant prévu est figé au moment de la validation — modifier
 * l'obligation plus tard ne réécrit pas le passé.
 */
export function completeObligation(
  data: PatrimoineData,
  input: CompletionInput,
  today: DateString,
): CompletionOutcome | null {
  const obligation = data.obligations.find((item) => item.id === input.obligation_id)
  if (!obligation) return null

  let nextDueDate = calculateNextDueDate({
    currentDueDate: obligation.next_due_date,
    completionDate: input.completed_date,
    frequencyDays: obligation.frequency_days,
    calculationBasis: obligation.calculation_basis,
  })

  // Rattrapage d'un retard de plusieurs cycles : uniquement sur choix explicite.
  if (input.advance_until_future) {
    nextDueDate = advanceUntilFutureDate(nextDueDate, obligation.frequency_days, today)
  }

  const completionId = newId()

  return {
    completionId,
    obligationName: obligation.name,
    previousDueDate: obligation.next_due_date,
    nextDueDate,
    data: {
      ...data,
      obligations: data.obligations.map((item) =>
        item.id === obligation.id
          ? { ...item, next_due_date: nextDueDate, updated_at: stamp() }
          : item,
      ),
      completions: [
        ...data.completions,
        {
          id: completionId,
          obligation_id: obligation.id,
          scheduled_due_date: obligation.next_due_date,
          completed_date: input.completed_date,
          expected_amount_snapshot: obligation.expected_amount,
          actual_amount: input.actual_amount,
          currency: obligation.currency,
          notes: input.notes,
          created_at: stamp(),
        },
      ],
    },
  }
}

/**
 * Annulation : restaure l'échéance précédente et retire la ligne d'historique.
 * Seule la dernière validation d'une obligation peut être annulée.
 */
export function undoCompletion(
  data: PatrimoineData,
  completionId: string,
): { data: PatrimoineData; restoredDueDate: DateString } | null {
  const completion = data.completions.find((item) => item.id === completionId)
  if (!completion) return null

  const latest = [...data.completions]
    .filter((item) => item.obligation_id === completion.obligation_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .at(-1)

  if (!latest || latest.id !== completion.id) return null

  return {
    restoredDueDate: completion.scheduled_due_date,
    data: {
      ...data,
      obligations: data.obligations.map((obligation) =>
        obligation.id === completion.obligation_id
          ? {
              ...obligation,
              next_due_date: completion.scheduled_due_date,
              updated_at: stamp(),
            }
          : obligation,
      ),
      completions: data.completions.filter((item) => item.id !== completionId),
    },
  }
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export function editProfile(data: PatrimoineData, input: ProfileInput): PatrimoineData {
  return {
    ...data,
    profile: {
      ...data.profile,
      ...input,
      default_reminder_days: normalizeReminderDays(input.default_reminder_days),
    },
  }
}
