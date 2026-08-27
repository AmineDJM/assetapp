'use client'

import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils/cn'

export const RadioGroup = RadioGroupPrimitive.Root

/** Option en carte : titre + explication courte, toute la carte est cliquable. */
export function RadioCard({
  value,
  title,
  description,
  id,
}: {
  value: string
  title: string
  description: string
  id: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line p-3 transition-colors hover:border-line-strong has-[button[data-state=checked]]:border-ink has-[button[data-state=checked]]:bg-surface-muted"
    >
      <RadioGroupPrimitive.Item
        id={id}
        value={value}
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface transition-colors data-[state=checked]:border-ink',
        )}
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-ink" />
      </RadioGroupPrimitive.Item>
      <span className="space-y-0.5">
        <span className="block text-[13px] font-medium text-ink">{title}</span>
        <span className="block text-xs leading-relaxed text-muted">{description}</span>
      </span>
    </label>
  )
}
