'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/data/auth'
import { profileInputSchema } from '@/lib/validation/schemas'
import { normalizeReminderDays } from '@/lib/reminders/rules'
import { describeDatabaseError, fail, ok, type ActionResult } from './result'

/** Mise à jour du profil : nom, fuseau, devise et préférences de rappel. */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const auth = await requireUserId()
  if (!auth.ok) return fail(auth.error)

  const parsed = profileInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie les champs du formulaire.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').upsert({
    id: auth.userId,
    ...parsed.data,
    default_reminder_days: normalizeReminderDays(parsed.data.default_reminder_days),
  })

  if (error) return fail(describeDatabaseError(error))

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return ok()
}
