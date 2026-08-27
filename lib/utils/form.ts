import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ActionResult } from '@/actions/result'

/**
 * Reporte les erreurs renvoyées par une Server Action dans le formulaire.
 *
 * Les formulaires n'embarquent pas de second schéma de validation : la
 * validation Zod du serveur est la seule autorité, et ses messages
 * remontent ici champ par champ. Une règle, un endroit.
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  result: Extract<ActionResult<unknown>, { ok: false }>,
): void {
  if (!result.fieldErrors) return
  for (const [field, messages] of Object.entries(result.fieldErrors)) {
    const message = messages?.[0]
    if (message) setError(field as Path<T>, { type: 'server', message })
  }
}

/** Première erreur d'un champ, prête à passer à `<Field error=…>`. */
export function fieldError(message: unknown): string | undefined {
  return typeof message === 'string' ? message : undefined
}
