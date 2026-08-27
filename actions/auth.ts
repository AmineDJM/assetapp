'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fail, ok, type ActionResult } from './result'

/** Authentification email + mot de passe (Supabase Auth). */

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

function describeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email ou mot de passe incorrect.'
  if (/email not confirmed/i.test(message)) {
    return 'Adresse email non confirmée. Vérifie ta boîte de réception.'
  }
  if (/user already registered/i.test(message)) return 'Un compte existe déjà pour cet email.'
  if (/rate limit|too many/i.test(message)) return 'Trop de tentatives. Réessaie dans un instant.'
  return message
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie tes identifiants.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return fail(describeAuthError(error.message))

  revalidatePath('/', 'layout')
  return ok()
}

export async function signUp(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) {
    return fail('Vérifie tes identifiants.', parsed.error.flatten().fieldErrors)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) return fail(describeAuthError(error.message))

  revalidatePath('/', 'layout')
  // Sans session, Supabase attend une confirmation par email.
  return ok({ needsConfirmation: !data.session })
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
