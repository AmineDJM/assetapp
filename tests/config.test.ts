import { afterEach, describe, expect, it, vi } from 'vitest'
import { diagnoseDatabaseError, getMissingRequiredEnv, isSupabaseConfigured } from '@/lib/config'

/**
 * Une configuration incomplète doit produire un écran qui explique quoi faire.
 * Ces tests figent le comportement qui, avant correction, renvoyait une erreur
 * 500 opaque sur toutes les routes, page de connexion comprise.
 */

const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL }
  vi.unstubAllEnvs()
})

describe('getMissingRequiredEnv', () => {
  it('ne signale rien quand tout est configuré', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemple.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'cle-publique')
    expect(getMissingRequiredEnv()).toEqual([])
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('signale précisément la variable absente', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemple.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    const missing = getMissingRequiredEnv()
    expect(missing).toHaveLength(1)
    expect(missing[0]?.name).toBe('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('signale les deux quand aucune n’est définie', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(getMissingRequiredEnv().map((item) => item.name)).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ])
  })

  it('marque les variables lues par le navigateur, qui exigent un redéploiement', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(getMissingRequiredEnv().every((item) => item.public)).toBe(true)
  })

  it('n’exige ni les clés VAPID ni Resend : les rappels sont optionnels', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemple.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'cle-publique')
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
    vi.stubEnv('RESEND_API_KEY', '')
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('ne lève jamais, même sans aucune variable', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(() => getMissingRequiredEnv()).not.toThrow()
    expect(() => isSupabaseConfigured()).not.toThrow()
  })
})

describe('diagnoseDatabaseError', () => {
  it('reconnaît une base non migrée (PostgREST)', () => {
    expect(
      diagnoseDatabaseError(
        new Error(
          "Lecture des échéances impossible : Could not find the table 'public.obligations' in the schema cache",
        ),
      ),
    ).toBe('missing-schema')
  })

  it('reconnaît une table absente (PostgreSQL 42P01)', () => {
    expect(
      diagnoseDatabaseError(new Error('42P01: relation "public.assets" does not exist')),
    ).toBe('missing-schema')
  })

  it('reconnaît un projet injoignable ou en pause', () => {
    expect(diagnoseDatabaseError(new TypeError('fetch failed'))).toBe('unreachable')
    expect(diagnoseDatabaseError(new Error('getaddrinfo ENOTFOUND xyz.supabase.co'))).toBe(
      'unreachable',
    )
    expect(diagnoseDatabaseError(new Error('Invalid URL'))).toBe('unreachable')
  })

  it('ne masque pas une erreur applicative ordinaire', () => {
    expect(diagnoseDatabaseError(new Error('new row violates row-level security policy'))).toBeNull()
    expect(diagnoseDatabaseError(new Error('duplicate key value violates unique constraint'))).toBeNull()
  })

  it('accepte une valeur qui n’est pas une Error', () => {
    expect(() => diagnoseDatabaseError('texte brut')).not.toThrow()
    expect(diagnoseDatabaseError(null)).toBeNull()
  })
})
