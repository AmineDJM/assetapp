/** Lecture centralisée et explicite des variables d'environnement Supabase. */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL est manquant. Copiez .env.example vers .env.local.',
    )
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant. Copiez .env.example vers .env.local.',
    )
  }
  return key
}
