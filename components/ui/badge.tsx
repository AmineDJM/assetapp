import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import type { DueStatus } from '@/types/domain'
import { formatDaysRemaining } from '@/lib/recurrence'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-muted',
        outline: 'border border-line text-muted',
        danger: 'bg-danger-soft text-danger',
        warning: 'bg-warning-soft text-warning',
        success: 'bg-success-soft text-success',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

/** La couleur ne porte jamais seule l'information : le texte la répète. */
const STATUS_TONE: Record<DueStatus, VariantProps<typeof badgeVariants>['tone']> = {
  overdue: 'danger',
  today: 'warning',
  soon: 'warning',
  upcoming: 'neutral',
}

export function StatusBadge({
  status,
  daysRemaining,
  className,
}: {
  status: DueStatus
  daysRemaining: number
  className?: string
}) {
  return (
    <Badge tone={STATUS_TONE[status]} className={cn('tabular', className)}>
      {formatDaysRemaining(daysRemaining)}
    </Badge>
  )
}

export { badgeVariants }
