'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/data/auth'
import { idSchema, obligationInputSchema } from '@/lib/validation/schemas'
import { normalizeReminderDays } from '@/lib/reminders/rules'
import { describeDatabaseError, fail, ok, type ActionResult } from './result'
import type { Obligation } from '@/types/domain'

/** Mutations sur les obligations. */

function revalidateObligationViews(assetId?: string): void {
  revalidatePath('/dashboard')
  revalidatePath('/assets')
  revalidatePath('/obligations')
  revalidatePath('/history')
  if (assetId) revalidatePath(`/assets/${assetId}`)
}

export async function createObligation(input: unknown): Promise<ActionResult<Obligation>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const parsed = obligationInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()

  // Le bien doit appartenir à l'utilisateur. La base l'impose déjà via la clé
  // étrangère composite ; ce contrôle rend l'erreur lisible.
  const { data: asset } = await supabase
    .from('assets')
    .select('id')
    .eq('id', parsed.data.asset_id)
    .maybeSingle()

  if (!asset) return fail('Bien introuvable.', { asset_id: ['Bien introuvable'] })

  const { data, error } = await supabase
    .from('obligations')
    .insert({
      ...parsed.data,
      reminder_days_before: normalizeReminderDays(parsed.data.reminder_days_before),
      user_id: auth.userId,
    })
    .select('*')
    .single()

  if (error) return fail(describeDatabaseError(error))

  revalidateObligationViews(data.asset_id)
  return ok(data)
}

/**
 * Modifier une obligation ne réécrit jamais l'historique : changer la
 * fréquence, l'échéance ou la base de calcul n'affecte que les échéances à
 * venir. Les lignes de `obligation_completions` restent telles quelles.
 */
export async function updateObligation(
  obligationId: string,
  input: unknown,
): Promise<ActionResult<Obligation>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(obligationId)
  if (!id.success) return fail('Identifiant d’obligation invalide.')

  const parsed = obligationInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('obligations')
    .update({
      ...parsed.data,
      reminder_days_before: normalizeReminderDays(parsed.data.reminder_days_before),
    })
    .eq('id', id.data)
    .eq('user_id', auth.userId)
    .select('*')
    .maybeSingle()

  if (error) return fail(describeDatabaseError(error))
  if (!data) return fail('Obligation introuvable.')

  revalidateObligationViews(data.asset_id)
  return ok(data)
}

export async function setObligationArchived(
  obligationId: string,
  archived: boolean,
): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(obligationId)
  if (!id.success) return fail('Identifiant d’obligation invalide.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('obligations')
    .update({ is_active: !archived })
    .eq('id', id.data)
    .eq('user_id', auth.userId)
    .select('asset_id')
    .maybeSingle()

  if (error) return fail(describeDatabaseError(error))
  if (!data) return fail('Obligation introuvable.')

  revalidateObligationViews(data.asset_id)
  return ok()
}

export async function deleteObligation(obligationId: string): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(obligationId)
  if (!id.success) return fail('Identifiant d’obligation invalide.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('obligations')
    .delete()
    .eq('id', id.data)
    .eq('user_id', auth.userId)

  if (error) return fail(describeDatabaseError(error))

  revalidateObligationViews()
  return ok()
}
