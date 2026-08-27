'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  count?: number
}

/**
 * Barre de filtres. Rendue avec de vrais boutons dans un `radiogroup` : la
 * navigation clavier et l'annonce de l'état sélectionné sont natives.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('-mx-1 flex items-center gap-1 overflow-x-auto px-1 py-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              selected
                ? 'bg-ink text-white'
                : 'text-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn('tabular ml-1.5', selected ? 'text-white/60' : 'text-subtle')}>
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
