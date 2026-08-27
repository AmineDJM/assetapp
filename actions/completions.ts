'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/data/auth'
import { getSessionContext } from '@/lib/data/session'
import { completionInputSchema, idSchema } from '@/lib/validation/schemas'
import { advanceUntilFutureDate, calculateNextDueDate } from '@/lib/recurrence'
import { formatLongDate } from '@/lib/dates'
import { describeDatabaseError, fail, ok, type ActionResult } from './result'
import type { DateString } from '@/types/domain'

/**
 * Validation d'une échéance (« ✓ Fait ») et annulation.
 *
 * Le calcul de la prochaine échéance est délégué à `lib/recurrence`, la seule
 * implémentation de la règle métier, couverte par les tests. L'écriture passe
 * par la fonction PostgreSQL `mark_obligation_complete`, qui garantit que
 * l'historique et l'obligation sont mis à jour dans une même transaction :
 * jamais d'historique créé sans échéance recalculée.
 */

export interface CompletionSuccess {
  completionId: string
  obligationName: string
  previousDueDate: DateString
  nextDueDate: DateString
  nextDueDateLabel: string
  /** Vrai si la nouvelle échéance reste dans le passé (retard non rattrapé). */
  stillOverdue: boolean
}

export async function markObligationComplete(
  input: unknown,
): Promise<ActionResult<CompletionSuccess>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const parsed = completionInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const session = await getSessionContext()
  if (!session) return fail('Session expirée. Reconnecte-toi.')

  const { obligation_id, completed_date, actual_amount, notes, advance_until_future } =
    parsed.data

  const supabase = await createClient()
  const { data: obligation, error: readError } = await supabase
    .from('obligations')
    .select('id, asset_id, name, frequency_days, calculation_basis, next_due_date')
    .eq('id', obligation_id)
    .maybeSingle()

  if (readError) return fail(describeDatabaseError(readError))
  if (!obligation) return fail('Obligation introuvable.')

  let nextDueDate = calculateNextDueDate({
    currentDueDate: obligation.next_due_date,
    completionDate: completed_date,
    frequencyDays: obligation.frequency_days,
    calculationBasis: obligation.calculation_basis,
  })

  // Rattrapage d'un retard de plusieurs cycles : uniquement sur choix
  // explicite de l'utilisateur, jamais en silence.
  if (advance_until_future) {
    nextDueDate = advanceUntilFutureDate(
      nextDueDate,
      obligation.frequency_days,
      session.today,
    )
  }

  const { data, error } = await supabase.rpc('mark_obligation_complete', {
    p_obligation_id: obligation_id,
    p_completed_date: completed_date,
    p_next_due_date: nextDueDate,
    p_actual_amount: actual_amount,
    p_notes: notes,
  })

  if (error) return fail(describeDatabaseError(error))

  const result = Array.isArray(data) ? data[0] : data
  if (!result) return fail('La validation n’a pas pu être enregistrée.')

  revalidatePath('/dashboard')
  revalidatePath('/assets')
  revalidatePath('/obligations')
  revalidatePath('/history')
  revalidatePath(`/assets/${obligation.asset_id}`)

  return ok({
    completionId: result.completion_id,
    obligationName: obligation.name,
    previousDueDate: result.previous_due_date,
    nextDueDate: result.next_due_date,
    nextDueDateLabel: formatLongDate(result.next_due_date),
    stillOverdue: result.next_due_date < session.today,
  })
}

/** « Annuler » du toast : restaure l'échéance et supprime la ligne d'historique. */
export async function undoObligationCompletion(
  completionId: string,
): Promise<ActionResult<{ restoredDueDate: DateString }>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(completionId)
  if (!id.success) return fail('Identifiant de validation invalide.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('undo_obligation_completion', {
    p_completion_id: id.data,
  })

  if (error) return fail(describeDatabaseError(error))

  const result = Array.isArray(data) ? data[0] : data
  if (!result) return fail('Validation introuvable.')

  revalidatePath('/dashboard')
  revalidatePath('/assets')
  revalidatePath('/obligations')
  revalidatePath('/history')

  return ok({ restoredDueDate: result.restored_due_date })
}
