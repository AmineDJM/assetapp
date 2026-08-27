/**
 * État de configuration de l'application.
 *
 * Aucune de ces fonctions ne lève : une variable manquante doit produire un
 * écran qui explique quoi faire, jamais une erreur 500 opaque sur toutes les
 * routes.
 */

export interface EnvRequirement {
  name: string
  purpose: string
  /** `true` si la valeur est lue par le navigateur (redéploiement requis). */
  public: boolean
}

const REQUIRED: EnvRequirement[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    purpose: 'URL du projet Supabase (Project Settings → API).',
    public: true,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    purpose: 'Clé publique Supabase (anon / publishable), protégée par le RLS.',
    public: true,
  },
]

/** Variables indispensables au fonctionnement de l'application. */
export function getMissingRequiredEnv(): EnvRequirement[] {
  // Les `process.env.X` sont écrits en toutes lettres : Next.js les remplace
  // à la compilation, un accès dynamique ne fonctionnerait pas.
  const values: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
  return REQUIRED.filter((item) => !values[item.name])
}

export function isSupabaseConfigured(): boolean {
  return getMissingRequiredEnv().length === 0
}

/**
 * Diagnostic d'une erreur de lecture : distingue « la base n'est pas encore
 * migrée » d'une panne réelle, pour afficher la bonne consigne.
 */
export type DatabaseDiagnosis = 'missing-schema' | 'unreachable' | null

export function diagnoseDatabaseError(error: unknown): DatabaseDiagnosis {
  const message = error instanceof Error ? error.message : String(error)

  // PostgREST : PGRST205 (table absente du cache de schéma), PostgreSQL : 42P01.
  if (
    /PGRST205/.test(message) ||
    /42P01/.test(message) ||
    /does not exist/i.test(message) ||
    /schema cache/i.test(message)
  ) {
    return 'missing-schema'
  }

  if (
    /fetch failed/i.test(message) ||
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN/.test(message) ||
    /Invalid URL/i.test(message)
  ) {
    return 'unreachable'
  }

  return null
}
