'use client'

import { cn } from '@/lib/utils/cn'
import { formatReminderThreshold, REMINDER_PRESET_OPTIONS } from '@/lib/reminders/rules'

/**
 * Sélection des seuils de rappel, stockés en `number[]` de jours avant
 * l'échéance. Aucune notion de « mensuel » ou « hebdomadaire ».
 */
export function ReminderPicker({
  value,
  onChange,
  idPrefix = 'reminder',
}: {
  value: number[]
  onChange: (value: number[]) => void
  idPrefix?: string
}) {
  function toggle(days: number) {
    onChange(
      value.includes(days)
        ? value.filter((item) => item !== days)
        : [...value, days].sort((a, b) => b - a),
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REMINDER_PRESET_OPTIONS.map((days) => {
        const selected = value.includes(days)
        return (
          <button
            key={days}
            id={`${idPrefix}-${days}`}
            type="button"
            role="switch"
            aria-checked={selected}
            onClick={() => toggle(days)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              selected
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-surface text-muted hover:border-subtle hover:text-ink',
            )}
          >
            {formatReminderThreshold(days)}
          </button>
        )
      })}
    </div>
  )
}
