'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { FREQUENCY_PRESETS } from '@/lib/taxonomy'

/**
 * Fréquence en jours.
 *
 * Les raccourcis ne font que préremplir : toute valeur entière reste saisissable
 * (45, 75, 120, 400…). Le libellé affiche toujours « jours », jamais
 * « mensuel » ou « annuel », pour que la règle de calcul reste évidente.
 */
export function FrequencyInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const parsed = Number(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative w-32">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            max={36500}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={invalid || undefined}
            className="tabular pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle">
            jours
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {FREQUENCY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(String(preset))}
              aria-label={`Fréquence de ${preset} jours`}
              className={cn(
                'tabular rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                parsed === preset
                  ? 'border-ink bg-ink text-white'
                  : 'border-line-strong bg-surface text-muted hover:border-subtle hover:text-ink',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
