'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/data/auth'
import { assetInputSchema, idSchema } from '@/lib/validation/schemas'
import { describeDatabaseError, fail, ok, type ActionResult } from './result'
import type { Asset } from '@/types/domain'

/**
 * Mutations sur les biens et véhicules.
 *
 * Chaque action revérifie l'authentification côté serveur et valide ses
 * entrées avec Zod avant toute écriture. Le RLS reste la barrière finale.
 */

function revalidateAssetViews(assetId?: string): void {
  revalidatePath('/dashboard')
  revalidatePath('/assets')
  revalidatePath('/obligations')
  revalidatePath('/settings')
  if (assetId) revalidatePath(`/assets/${assetId}`)
}

export async function createAsset(input: unknown): Promise<ActionResult<Asset>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const parsed = assetInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .insert({ ...parsed.data, user_id: auth.userId })
    .select('*')
    .single()

  if (error) return fail(describeDatabaseError(error))

  revalidateAssetViews(data.id)
  return ok(data)
}

export async function updateAsset(
  assetId: string,
  input: unknown,
): Promise<ActionResult<Asset>> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(assetId)
  if (!id.success) return fail('Identifiant de bien invalide.')

  const parsed = assetInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(parsed.data)
    .eq('id', id.data)
    .eq('user_id', auth.userId)
    .select('*')
    .maybeSingle()

  if (error) return fail(describeDatabaseError(error))
  if (!data) return fail('Bien introuvable.')

  revalidateAssetViews(data.id)
  return ok(data)
}

/**
 * Archivage plutôt que suppression : un bien archivé disparaît des écrans
 * actifs mais son historique reste intact et l'action est réversible.
 */
export async function setAssetArchived(
  assetId: string,
  archived: boolean,
): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(assetId)
  if (!id.success) return fail('Identifiant de bien invalide.')

  const supabase = await createClient()

  const { error } = await supabase
    .from('assets')
    .update({ is_active: !archived })
    .eq('id', id.data)
    .eq('user_id', auth.userId)

  if (error) return fail(describeDatabaseError(error))

  // Les obligations suivent le sort de leur bien : archiver un bien sans
  // archiver ses obligations laisserait des échéances orphelines au dashboard.
  const { error: obligationError } = await supabase
    .from('obligations')
    .update({ is_active: !archived })
    .eq('asset_id', id.data)
    .eq('user_id', auth.userId)

  if (obligationError) return fail(describeDatabaseError(obligationError))

  revalidateAssetViews(id.data)
  return ok()
}

/** Suppression définitive : l'historique lié disparaît aussi (cascade). */
export async function deleteAsset(assetId: string): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const id = idSchema.safeParse(assetId)
  if (!id.success) return fail('Identifiant de bien invalide.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id.data)
    .eq('user_id', auth.userId)

  if (error) return fail(describeDatabaseError(error))

  revalidateAssetViews()
  return ok()
}
