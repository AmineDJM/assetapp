import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils/cn'

/**
 * Enveloppe de champ : label lié, aide et message d'erreur annoncés aux
 * lecteurs d'écran.
 */

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-[13px] font-medium text-ink-soft', className)}
      {...props}
    />
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: React.ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional ? <span className="text-xs text-subtle">Optionnel</span> : null}
      </div>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': error ? true : undefined,
          })
        : children}

      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
