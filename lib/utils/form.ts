import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Pont entre les schémas Zod et React Hook Form.
 *
 * La validation Zod est la seule autorité : les formulaires n'embarquent pas
 * de second jeu de règles. Une règle, un endroit.
 */

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

/**
 * Valide une saisie et reporte les erreurs champ par champ dans le formulaire.
 * Renvoie la valeur normalisée par le schéma en cas de succès.
 */
export function validateForm<Schema extends z.ZodType, Values extends FieldValues>(
  schema: Schema,
  input: unknown,
  setError: UseFormSetError<Values>,
): ValidationOutcome<z.infer<Schema>> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, value: parsed.data }

  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string') {
      setError(field as Path<Values>, { type: 'validation', message: issue.message })
    }
  }

  const first = parsed.error.issues[0]
  return { ok: false, message: first?.message ?? 'Vérifie les champs du formulaire.' }
}

/** Première erreur d'un champ, prête à passer à `<Field error=…>`. */
export function fieldError(message: unknown): string | undefined {
  return typeof message === 'string' ? message : undefined
}
