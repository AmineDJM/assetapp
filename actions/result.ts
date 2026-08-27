/**
 * Résultat uniforme des Server Actions.
 *
 * Les erreurs remontent comme données, jamais comme exception : le formulaire
 * peut les afficher sans écran d'erreur global.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export function ok(): ActionResult
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T) {
  return { ok: true as const, data }
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

/** Traduit une erreur Postgres/PostgREST en message compréhensible. */
export function describeDatabaseError(error: { message: string; code?: string }): string {
  const message = error.message

  if (message.includes('OBLIGATION_NOT_FOUND') || message.includes('COMPLETION_NOT_FOUND')) {
    return 'Élément introuvable : il a peut-être été supprimé.'
  }
  if (message.includes('FORBIDDEN')) return 'Action non autorisée.'
  if (message.includes('AUTH_REQUIRED')) return 'Session expirée. Reconnecte-toi.'
  if (message.includes('NOT_LATEST_COMPLETION')) {
    return "Seule la dernière validation d'une obligation peut être annulée."
  }
  if (message.includes('obligations_frequency_positive')) {
    return 'La fréquence doit être un nombre entier de jours supérieur à zéro.'
  }
  if (message.includes('reminder_logs_unique')) return 'Ce rappel a déjà été envoyé.'
  if (error.code === '23505') return 'Cet élément existe déjà.'
  if (error.code === '42501' || message.includes('row-level security')) {
    return 'Action non autorisée.'
  }

  return `Une erreur est survenue : ${message}`
}
